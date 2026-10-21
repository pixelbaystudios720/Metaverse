// The game's side of live presence (server/live.mjs): one WebSocket to window.AA_LIVE while the game is open. Sends
// our look and chosen name once and where we are as we move (at most 10 times a second, and once a second standing still); hands the
// game everyone else in our room. Reconnects on its own, backing off up to 30 s.
export function joinLive(url, { look, name = '', onHi = () => {}, onPeer = () => {}, onLeave = () => {}, onState = () => {}, onCount = () => {}, onYou = () => {}, onSay = () => {}, onSaid = () => {}, onPvp = () => {} } = {}) {
  let ws = null, closed = false, wait = 2000, retry = 0, last = '', lastAt = 0, myLook = look, myName = name, myX = '';
  const sendRaw = (m) => { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); };
  function connect() {
    if (closed) return;
    try { ws = new WebSocket(url); } catch { return later(); }
    ws.onopen = () => { wait = 2000; last = ''; sendRaw({ t: 'look', look: myLook }); if (myName) sendRaw({ t: 'name', name: myName }); if (myX) setTimeout(() => sendRaw({ t: 'x', token: myX }), 500); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'hi') { onHi(m); m.all?.forEach(onPeer); onCount(m.n); }
      else if (m.t === 'j') onPeer(m);
      else if (m.t === 'l') onLeave(m.id);
      else if (m.t === 's') onState(m.s);
      else if (m.t === 'n') onCount(m.n);
      else if (m.t === 'you') onYou(m); // { name, refused? }: the name the server gave us
      else if (m.t === 'say') onSay(m.id, m.text); // a chat line in our room (ours too)
      else if (m.t === 'hit' || m.t === 'ko' || m.t === 'fx' || m.t === 'coins' || m.t === 'ms') onPvp(m); // Auda City: hits, knockouts, other players' tracers
      else if (m.t === 'said') onSaid(m.refused); // our line was refused, and why
    };
    ws.onclose = () => { ws = null; onState([]); onCount(0); later(); };
    ws.onerror = () => {};
  }
  function later() { if (closed) return; clearTimeout(retry); retry = setTimeout(connect, wait); wait = Math.min(30_000, wait * 1.6); }
  connect();
  return {
    // where: 'in', 'out' or a hall id; x, z position; h heading; v speed
    at(w, x, z, h, v, j = 0, d = 0, fly = null) {
      const now = performance.now(), key = `${w}|${x.toFixed(2)}|${z.toFixed(2)}|${h.toFixed(2)}|${v > .15 ? v.toFixed(1) : 0}|${j.toFixed(2)}|${d}|${fly ? fly.y.toFixed(1) + fly.r.toFixed(2) : ''}`;
      if (now - lastAt < 100 || (key === last && now - lastAt < 1000)) return;
      last = key; lastAt = now; sendRaw(fly ? { t: 'at', w, x, z, h, v, j, d, y: fly.y, r: fly.r, p: fly.p } : { t: 'at', w, x, z, h, v, j, d });
    },
    look(l) { myLook = l; sendRaw({ t: 'look', look: l }); },
    name(n) { myName = n; sendRaw({ t: 'name', name: n }); },
    pvp(m) { sendRaw(m); },
    say(text) { sendRaw({ t: 'say', text: String(text).slice(0, 80) }); },
    x(token) { myX = token; sendRaw({ t: 'x', token }); }, // link our X handle (the server checks the key)
    close() { closed = true; clearTimeout(retry); ws?.close(); ws = null; },
  };
}
