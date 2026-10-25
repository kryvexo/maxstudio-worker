// MAX STUDIO - Listen Together (Cloudflare Durable Object)
// Protocol: app ke listentogether/Protocol.kt se match (JSON frames).
// Ek hi Hub instance sab rooms sambhalta hai (idFromName('main')).

const CFG = {
  maxRooms: 2000,
  maxUsers: 20,
  graceMs: 120_000,       // disconnect ke baad wapas aane ka time
  bufferTimeoutMs: 10_000,
  maxMsgsPer10s: 80,
  sendServerTime: false,  // true => guests position + (now - server_time) se adjust honge
};

const now = () => Date.now();
const uid = () => 'u' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
const token = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
const str = (v, n) => String(v ?? '').slice(0, n);

function cleanName(v) {
  const s = String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return [...s].slice(0, 24).join('');
}

function cleanTrack(t) {
  if (!t || typeof t !== 'object' || !t.id || t.title == null) return null;
  return {
    id: String(t.id),
    title: str(t.title, 300),
    artist: str(t.artist, 300),
    album: t.album != null ? str(t.album, 300) : null,
    duration: Math.trunc(Number(t.duration) || 0),
    thumbnail: t.thumbnail != null ? str(t.thumbnail, 600) : null,
    suggested_by: t.suggested_by != null ? str(t.suggested_by, 48) : null,
  };
}

function cleanQueue(q) {
  if (!Array.isArray(q)) return [];
  return q.slice(0, 500).map(cleanTrack).filter(Boolean);
}

function genCode(rooms) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const alpha = letters + '23456789';
  for (;;) {
    const r = crypto.getRandomValues(new Uint8Array(8));
    let c = letters[r[0] % letters.length];
    for (let i = 1; i < 8; i++) c += alpha[r[i] % alpha.length];
    if (!rooms.has(c)) return c;
  }
}

function send(ws, type, payload) {
  if (!ws || ws.readyState !== 1) return;
  const m = { type };
  if (payload !== undefined) m.payload = payload;
  try { ws.send(JSON.stringify(m)); } catch (_) { /* socket band ho gaya */ }
}

const fail = (ws, code, message) => send(ws, 'error', { code, message });

function livePos(room) {
  return room.position + (room.playing ? Math.max(0, now() - room.updated) : 0);
}

function roomState(room) {
  const ids = [...room.users.keys()].sort((a, b) => (b === room.host) - (a === room.host));
  return {
    room_code: room.code,
    host_id: room.host,
    users: ids.map((id) => ({
      user_id: id, username: room.users.get(id).name,
      is_host: id === room.host, is_connected: !!room.users.get(id).ws,
    })),
    current_track: room.track,
    is_playing: room.playing,
    position: livePos(room),
    last_update: now(),
    volume: room.volume,
    queue: room.queue,
    allow_participant_control: room.allowCtl,
  };
}

function broadcast(room, type, payload, except) {
  for (const [id, u] of room.users) {
    if (id !== except && u.ws) send(u.ws, type, payload);
  }
}

export class Hub {
  constructor(state, env) {
    this.rooms = new Map();     // code -> room
    this.sessions = new Map();  // token -> {room, user}
    this.meta = new WeakMap();  // ws -> {room, user, pending, hits, win}
    this.cleaner = null;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.meta.set(server, { room: null, user: null, pending: null, hits: 0, win: now() });
    server.addEventListener('message', (e) => {
      try { this.onMessage(server, e.data); } catch (err) { fail(server, 'internal_error', 'Server error'); console.error(err); }
    });
    server.addEventListener('close', () => this.onClose(server));
    server.addEventListener('error', () => this.onClose(server));
    this.startCleaner();
    return new Response(null, { status: 101, webSocket: client });
  }

  startCleaner() {
    if (this.cleaner) return;
    this.cleaner = setInterval(() => {
      const t = now();
      for (const [code, room] of this.rooms) {
        for (const [id, u] of [...room.users]) {
          if (u.gone && t - u.gone > CFG.graceMs) this.removeUser(code, id);
          if (!this.rooms.has(code)) break;
        }
      }
      if (this.rooms.size === 0) { clearInterval(this.cleaner); this.cleaner = null; }
    }, 15_000);
  }

  onClose(ws) {
    const m = this.meta.get(ws);
    if (!m) return;
    this.meta.delete(ws);
    if (m.pending) this.rooms.get(m.pending.room)?.pending.delete(m.pending.uid);
    const room = m.room && this.rooms.get(m.room);
    const u = room?.users.get(m.user);
    if (u && u.ws === ws) {           // reconnect ke baad purani conn ignore
      u.ws = null;
      u.gone = now();
      broadcast(room, 'user_disconnected', { user_id: m.user, username: u.name });
    }
  }

  // ---------- room logic ----------
  finishBuffer(room, trackId) {
    if (!room.buffer || room.buffer.track !== trackId) return;
    clearTimeout(room.buffer.timer);
    room.buffer = null;
    broadcast(room, 'buffer_complete', { track_id: trackId });
  }

  startBuffer(room, trackId, senderId) {
    if (room.buffer) clearTimeout(room.buffer.timer);
    const waiting = new Set();
    for (const [id, u] of room.users) if (id !== room.host && id !== senderId && u.ws) waiting.add(id);
    if (!waiting.size) { room.buffer = null; return; }
    const timer = setTimeout(() => this.finishBuffer(room, trackId), CFG.bufferTimeoutMs);
    room.buffer = { track: trackId, waiting, timer };
    broadcast(room, 'buffer_wait', { track_id: trackId, waiting_for: [...waiting] });
  }

  destroyRoom(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.buffer) clearTimeout(room.buffer.timer);
    for (const u of room.users.values()) this.sessions.delete(u.token);
    this.rooms.delete(code);
  }

  removeUser(code, id) {
    const room = this.rooms.get(code);
    const u = room?.users.get(id);
    if (!u) return;
    this.sessions.delete(u.token);
    room.users.delete(id);
    if (u.ws) { const m = this.meta.get(u.ws); if (m) { m.room = null; m.user = null; } }

    if (room.users.size === 0) { this.destroyRoom(code); return; }
    broadcast(room, 'user_left', { user_id: id, username: u.name });

    if (room.buffer?.waiting.delete(id) && room.buffer.waiting.size === 0) this.finishBuffer(room, room.buffer.track);

    if (room.host === id) {
      let next = null;
      for (const [k, x] of room.users) if (x.ws) { next = k; break; }
      if (!next) next = room.users.keys().next().value;
      room.host = next;
      broadcast(room, 'host_changed', { new_host_id: next, new_host_name: room.users.get(next).name });
    }
  }

  // ---------- messages ----------
  onMessage(ws, data) {
    const m = this.meta.get(ws);
    if (!m) return;
    if (now() - m.win >= 10_000) { m.win = now(); m.hits = 0; }
    if (++m.hits > CFG.maxMsgsPer10s) return fail(ws, 'rate_limited', 'Too many messages');

    let msg;
    try { msg = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch (_) { msg = null; }
    if (!msg || typeof msg !== 'object' || !msg.type) return fail(ws, 'invalid_message', 'Invalid JSON');
    const type = String(msg.type);
    const p = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};

    if (type === 'ping') return send(ws, 'pong');

    // ---- room ke bahar ----
    if (type === 'create_room') {
      if (m.room) return fail(ws, 'already_in_room', 'Already in a room');
      if (this.rooms.size >= CFG.maxRooms) return fail(ws, 'server_full', 'Server is full');
      const name = cleanName(p.username);
      if (!name) return fail(ws, 'invalid_username', 'Username required');
      const code = genCode(this.rooms);
      const id = uid();
      const user = { name, ws, token: token(), gone: null };
      this.rooms.set(code, {
        code, host: id, users: new Map([[id, user]]), pending: new Map(),
        track: null, playing: false, position: 0, updated: now(), volume: 1,
        queue: [], allowCtl: false, suggestions: new Map(), buffer: null,
      });
      this.sessions.set(user.token, { room: code, user: id });
      m.room = code; m.user = id;
      this.startCleaner();
      return send(ws, 'room_created', { room_code: code, user_id: id, session_token: user.token });
    }

    if (type === 'join_room') {
      if (m.room) return fail(ws, 'already_in_room', 'Already in a room');
      const code = String(p.room_code ?? '').trim().toUpperCase();
      const name = cleanName(p.username);
      if (!name) return fail(ws, 'invalid_username', 'Username required');
      const room = this.rooms.get(code);
      if (!room) return fail(ws, 'room_not_found', 'Room not found');
      if (room.users.size + room.pending.size >= CFG.maxUsers) return fail(ws, 'room_full', 'Room is full');
      for (const [id, u] of [...room.users]) {
        if (u.name.toLowerCase() === name.toLowerCase()) {
          if (!u.ws && id !== room.host) this.removeUser(code, id);   // auto-rejoin case
          else return fail(ws, 'username_taken', 'Username already in use');
        }
      }
      const host = room.users.get(room.host);
      if (!host?.ws) return fail(ws, 'host_unavailable', 'Host is offline');
      const id = uid();
      room.pending.set(id, { name, ws });
      m.pending = { room: code, uid: id };
      return send(host.ws, 'join_request', { user_id: id, username: name });
    }

    if (type === 'reconnect') {
      const s = this.sessions.get(String(p.session_token ?? ''));
      const room = s && this.rooms.get(s.room);
      const u = room?.users.get(s.user);
      if (!u) return fail(ws, 'session_not_found', 'Session not found');
      if (u.ws && u.ws !== ws) { const old = u.ws; u.ws = null; try { old.close(1000, 'replaced'); } catch (_) {} }
      u.ws = ws; u.gone = null;
      m.room = s.room; m.user = s.user;
      send(ws, 'reconnected', { room_code: room.code, user_id: s.user, state: roomState(room), is_host: room.host === s.user });
      return broadcast(room, 'user_reconnected', { user_id: s.user, username: u.name }, s.user);
    }

    // ---- room ke andar ----
    const room = m.room && this.rooms.get(m.room);
    const me = room?.users.get(m.user);
    if (!me) { m.room = null; m.user = null; return fail(ws, 'not_in_room', 'Not in a room'); }
    const code = room.code, id = m.user, isHost = room.host === id;

    switch (type) {
      case 'leave_room':
        return this.removeUser(code, id);

      case 'approve_join':
      case 'reject_join': {
        if (!isHost) return fail(ws, 'not_host', 'Only host can do this');
        const pid = String(p.user_id ?? '');
        const pend = room.pending.get(pid);
        if (!pend) return fail(ws, 'request_not_found', 'Join request not found');
        room.pending.delete(pid);
        const pm = this.meta.get(pend.ws);
        if (pm) pm.pending = null;
        if (type === 'reject_join') return send(pend.ws, 'join_rejected', { reason: str(p.reason || 'Host rejected your request', 200) });
        const user = { name: pend.name, ws: pend.ws, token: token(), gone: null };
        room.users.set(pid, user);
        this.sessions.set(user.token, { room: code, user: pid });
        if (pm) { pm.room = code; pm.user = pid; }
        send(pend.ws, 'join_approved', { room_code: code, user_id: pid, session_token: user.token, state: roomState(room) });
        return broadcast(room, 'user_joined', { user_id: pid, username: pend.name }, pid);
      }

      case 'playback_action': {
        if (!isHost && !room.allowCtl) return fail(ws, 'not_allowed', 'Playback control not allowed');
        const a = String(p.action ?? '');
        const t = now();
        const out = { action: a };
        if (CFG.sendServerTime) out.server_time = t;
        switch (a) {
          case 'play':
          case 'pause': {
            const pos = p.position != null ? Math.max(0, Math.trunc(Number(p.position) || 0)) : livePos(room);
            room.playing = a === 'play'; room.position = pos; room.updated = t; out.position = pos;
            break;
          }
          case 'seek': {
            const pos = Math.max(0, Math.trunc(Number(p.position) || 0));
            room.position = pos; room.updated = t; out.position = pos;
            break;
          }
          case 'change_track': {
            const tr = cleanTrack(p.track_info);
            if (!tr) return fail(ws, 'invalid_track', 'track_info required');
            room.track = tr; room.playing = false; room.position = 0; room.updated = t;
            out.track_info = tr; out.track_id = tr.id;
            if (p.queue != null) { room.queue = cleanQueue(p.queue); out.queue = room.queue; }
            if (p.queue_title != null) out.queue_title = str(p.queue_title, 200);
            break;
          }
          case 'queue_add': {
            const tr = cleanTrack(p.track_info);
            if (!tr) return fail(ws, 'invalid_track', 'track_info required');
            if (p.insert_next) room.queue.unshift(tr); else room.queue.push(tr);
            room.queue = room.queue.slice(0, 500);
            out.track_info = tr; out.insert_next = !!p.insert_next;
            break;
          }
          case 'queue_remove': {
            const tid = String(p.track_id ?? '');
            room.queue = room.queue.filter((x) => x.id !== tid);
            out.track_id = tid;
            break;
          }
          case 'queue_clear':
            room.queue = [];
            break;
          case 'sync_queue':
            room.queue = cleanQueue(p.queue);
            out.queue = room.queue;
            if (p.queue_title != null) out.queue_title = str(p.queue_title, 200);
            break;
          case 'set_volume': {
            const v = Math.max(0, Math.min(1, Number(p.volume ?? 1) || 0));
            room.volume = v; out.volume = v;
            break;
          }
          case 'skip_next':
          case 'skip_prev':
            break; // sirf forward; client baad mein change_track bhejta hai
          default:
            return fail(ws, 'unknown_action', 'Unknown action');
        }
        broadcast(room, 'sync_playback', out, id);
        if (a === 'change_track') this.startBuffer(room, room.track.id, id);
        return;
      }

      case 'buffer_ready': {
        const tid = String(p.track_id ?? '');
        if (room.buffer?.track === tid) {
          room.buffer.waiting.delete(id);
          if (room.buffer.waiting.size === 0) this.finishBuffer(room, tid);
        }
        return;
      }

      case 'kick_user': {
        if (!isHost) return fail(ws, 'not_host', 'Only host can do this');
        const tid = String(p.user_id ?? '');
        const target = room.users.get(tid);
        if (tid === id || !target) return fail(ws, 'user_not_found', 'User not found');
        send(target.ws, 'kicked', { reason: str(p.reason || 'Removed by host', 200) });
        return this.removeUser(code, tid);
      }

      case 'transfer_host': {
        if (!isHost) return fail(ws, 'not_host', 'Only host can do this');
        const nid = String(p.new_host_id ?? '');
        if (nid === id || !room.users.has(nid)) return fail(ws, 'user_not_found', 'User not found');
        room.host = nid;
        return broadcast(room, 'host_changed', { new_host_id: nid, new_host_name: room.users.get(nid).name });
      }

      case 'chat': {
        const text = String(p.message ?? '').trim();
        if (!text) return;
        // sender ko bhi milta hai (client local echo nahi karta)
        return broadcast(room, 'chat', { user_id: id, username: me.name, message: text.slice(0, 1500), timestamp: now() });
      }

      case 'request_sync':
        return send(ws, 'sync_state', {
          current_track: room.track, is_playing: room.playing, position: livePos(room),
          last_update: now(), queue: room.queue, volume: room.volume,
        });

      case 'suggest_track': {
        const tr = cleanTrack(p.track_info);
        if (!tr) return fail(ws, 'invalid_track', 'track_info required');
        if (isHost) return fail(ws, 'not_allowed', 'Host does not need suggestions');
        tr.suggested_by = me.name;
        const sid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        room.suggestions.set(sid, { from: id, track: tr });
        if (room.suggestions.size > 100) room.suggestions.delete(room.suggestions.keys().next().value);
        return send(room.users.get(room.host)?.ws, 'suggestion_received', {
          suggestion_id: sid, from_user_id: id, from_username: me.name, track_info: tr,
        });
      }

      case 'approve_suggestion':
      case 'reject_suggestion': {
        if (!isHost) return fail(ws, 'not_host', 'Only host can do this');
        const sid = String(p.suggestion_id ?? '');
        const s = room.suggestions.get(sid);
        if (!s) return fail(ws, 'suggestion_not_found', 'Suggestion not found');
        room.suggestions.delete(sid);
        const target = room.users.get(s.from)?.ws;
        if (type === 'approve_suggestion') return send(target, 'suggestion_approved', { suggestion_id: sid, track_info: s.track });
        return send(target, 'suggestion_rejected', { suggestion_id: sid, reason: str(p.reason || 'Rejected', 200) });
      }

      case 'update_room_settings':
        if (!isHost) return fail(ws, 'not_host', 'Only host can do this');
        room.allowCtl = !!p.allow_participant_control;
        return broadcast(room, 'room_settings_changed', { allow_participant_control: room.allowCtl });

      default:
        return fail(ws, 'unknown_type', 'Unknown message type: ' + type);
    }
  }
}
