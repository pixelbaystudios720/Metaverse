// Full view of an agent's PC screen, opened by clicking its monitor (site cafe and game). Real agents show their own
// browser's latest session (screenshots from /api/agents/:id/screens) playing as a scroll, with the address bar, what
// it is doing and what it last read; sample agents show their booth's simulated page. Esc or × closes it.
// Each opening is a session: anything still in flight from an earlier one (a slow poll, a slide animation) is
// ignored once the viewer switches agents or closes, and polls never overlap. The badge says what you are watching:
// LIVE (a real agent's browser), RECORDED (a real session played back in the demo) or SIMULATED (a pretend page).
const css = `
.sv{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:clamp(12px,3vw,40px);background:rgba(14,10,28,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.sv[hidden]{display:none}
.sv-box{width:min(1180px,100%);max-height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:12px;color:#ece8ff;font:500 14px/1.45 system-ui,-apple-system,sans-serif}
.sv-top{display:flex;align-items:center;gap:12px}
.sv-top h2{margin:0;font:700 20px/1.1 "Fredoka",system-ui,sans-serif;letter-spacing:.01em}
.sv-top .sv-dot{width:12px;height:12px;border-radius:50%;background:var(--c,#62e6cf);box-shadow:0 0 12px var(--c,#62e6cf)}
.sv-top small{opacity:.7}
.sv-x{margin-left:auto;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:22px;cursor:pointer}
.sv-x:hover{background:rgba(255,255,255,.18)}
.sv-win{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);border-radius:14px;overflow:hidden;background:#0f0c1d;border:2px solid var(--c,#62e6cf);box-shadow:0 0 40px color-mix(in srgb,var(--c,#62e6cf) 45%,transparent),0 30px 80px rgba(0,0,0,.5)}
.sv-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#e9ebf3;color:#3b4157;font:500 14px/1 ui-monospace,Menlo,monospace}
.sv-bar i{width:12px;height:12px;border-radius:50%;background:#ff5f57}.sv-bar i+i{background:#febc2e}.sv-bar i+i+i{background:#28c840}
.sv-url{flex:1;min-width:0;margin-left:8px;padding:7px 14px;border-radius:999px;background:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sv-live{display:flex;align-items:center;gap:6px;color:#ff3b5c;font:700 12px/1 system-ui,sans-serif}.sv-live::before{content:"";width:9px;height:9px;border-radius:50%;background:#ff3b5c;animation:svp 1.2s infinite}
.sv-live[data-kind="recorded"],.sv-live[data-kind="simulated"]{color:#6b5fa0}.sv-live[data-kind="recorded"]::before,.sv-live[data-kind="simulated"]::before{background:#8f7cf2;animation:none}
@keyframes svp{50%{opacity:.25}}
.sv-page{position:relative;width:100%;height:min(66vh,calc(min(1180px,94vw)*.625));overflow:hidden;background:#f6f7fb}
.sv-page img,.sv-page canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;transition:transform .5s ease,opacity .5s ease}
.sv-page .out{transform:translateY(-100%)} .sv-page .in{transform:translateY(100%)}
.sv-empty{position:absolute;inset:0;display:grid;place-items:center;color:#5b6077;font-size:15px;text-align:center;padding:24px}
.sv-foot{display:grid;gap:10px}
.sv-note{margin:0;opacity:.85}
.sv-thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.sv-thumbs button{flex:none;width:120px;aspect-ratio:16/10;border-radius:8px;overflow:hidden;border:2px solid transparent;padding:0;background:#0f0c1d;cursor:pointer}
.sv-thumbs button.on{border-color:var(--c,#62e6cf)}
.sv-thumbs img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.sv-main{min-height:0;display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
.sv-main.has-desk{grid-template-columns:minmax(0,1fr) 300px}
.sv-desk{min-height:0;overflow:auto;border-radius:14px;background:#100e1a;border:1px solid color-mix(in srgb,var(--c,#62e6cf) 45%,transparent);padding:14px;font:500 13px/1.4 ui-monospace,Menlo,monospace;display:grid;align-content:start;gap:10px}
.sv-desk[hidden]{display:none}
.sv-desk h3{margin:0;display:flex;justify-content:space-between;align-items:baseline;font:700 14px/1.2 ui-monospace,Menlo,monospace;color:var(--c,#62e6cf);letter-spacing:.06em}
.sv-desk h3 span{color:#c9cede;font-weight:500;letter-spacing:0}
.sv-desk h4{margin:4px 0 0;font:600 11px/1 ui-monospace,Menlo,monospace;color:#7d7898;letter-spacing:.08em}
.sv-desk .row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:baseline;font-variant-numeric:tabular-nums}
.sv-desk .row b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ece8ff}
.sv-desk a{color:inherit;text-decoration:none}.sv-desk a:hover b,.sv-desk a:hover .t{text-decoration:underline}
.sv-desk .up{color:#3fdc97}.sv-desk .dn{color:#ff6b81}.sv-desk .mu{color:#7d7898}
.sv-desk .tr{display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:8px;align-items:baseline}
.sv-desk .tr .t{color:#c9cede;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sv-desk .s-buy{color:#3fdc97}.sv-desk .s-sell{color:#ff6b81}.sv-desk .s-launch{color:#b59cff}.sv-desk .s-fees{color:#ffd166}
.sv-desk .new{animation:svn 1.6s ease 2}
@keyframes svn{50%{background:color-mix(in srgb,var(--c,#62e6cf) 22%,transparent)}}
.sv-desk .why{color:#a7a2c4;font-family:system-ui,sans-serif;font-size:13px;line-height:1.45;margin:0}
@media (max-width:900px){.sv-main.has-desk{grid-template-columns:minmax(0,1fr)}.sv-desk{max-height:34vh}.sv-page{height:min(40vh,calc(94vw*.625))}}
.sv-page img{transition:transform .6s cubic-bezier(.3,.7,.3,1),opacity .35s ease}
.sv-cur{position:absolute;z-index:3;left:50%;top:45%;width:26px;height:26px;margin:-3px 0 0 -4px;pointer-events:none;transition:left .65s cubic-bezier(.4,.1,.2,1),top .65s cubic-bezier(.4,.1,.2,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))}
.sv-rip{position:absolute;z-index:2;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid var(--c,#62e6cf);pointer-events:none;animation:svr .65s ease-out forwards}
@keyframes svr{from{transform:scale(.2);opacity:1}to{transform:scale(1.3);opacity:0}}
.sv-act{position:absolute;z-index:3;left:14px;bottom:14px;max-width:calc(100% - 28px);padding:8px 14px 8px 30px;border-radius:999px;background:rgba(16,14,26,.86);color:#ece8ff;font:600 13px/1.2 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.sv-act::before{content:"";position:absolute;left:12px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--c,#62e6cf);animation:svp 1.2s infinite}
@media (prefers-reduced-motion:reduce){.sv-page img,.sv-page canvas{transition:none}.sv-live::before{animation:none}}
`;
let root = null, timer = 0, poll = 0, raf = 0, lastFocus = null, gen = 0, stop = () => {}; // gen: the current viewing session
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const host = (u) => { try { const x = new URL(u); return x.host + (x.pathname.length > 1 ? x.pathname : '') + x.search; } catch { return String(u || ''); } };
const CURSOR = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 2.5 19.5 13l-7 1.2 4 7.3-3 1.6-4-7.4L4 20z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const src = (u) => (String(u || '').startsWith('/api/') ? (window.AA_API || '') + u : u); // screenshots load straight from the API host
function session(frames) { const out = []; for (const f of frames || []) { out.push(f); if (f.step === 0) break; } return out.reverse(); }

function ensure() {
  if (root) return root;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  root = document.createElement('div'); root.className = 'sv'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', "An agent's screen");
  root.innerHTML = `<div class="sv-box"><div class="sv-top"><span class="sv-dot"></span><div><h2 class="sv-name"></h2><small class="sv-sub"></small></div><button class="sv-x" aria-label="Close">&times;</button></div>
    <div class="sv-main"><div class="sv-win"><div class="sv-bar"><i></i><i></i><i></i><span class="sv-url"></span><span class="sv-live">LIVE</span></div><div class="sv-page"></div></div><aside class="sv-desk" aria-label="Trading desk" hidden></aside></div>
    <div class="sv-foot"><p class="sv-note"></p><div class="sv-thumbs" aria-label="Recent screens"></div></div></div>`;
  document.body.appendChild(root);
  root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('.sv-x')) closeScreenView(); });
  addEventListener('keydown', (e) => { if (!root.hidden && e.key === 'Escape') { e.stopPropagation(); closeScreenView(); } }, true);
  return root;
}

// Recorded real browsing sessions for the demo (scripts/record-demo.mjs → demo/screens/index.json), played on sample
// agents' computers when there is no live agent server.
let demoP = null;
export const demoSessions = () => (demoP ??= fetch('demo/screens/index.json').then((r) => (r.ok ? r.json() : [])).then((l) => l.filter((x) => x.frames?.length)).catch(() => []));

// agent: { name, pipId?, fluid?, frames? (a recorded session), sim?: () => HTMLCanvasElement (a tall simulated page) }
export function openScreenView(agent, { api = (p) => fetch((window.AA_API || '') + p).then((r) => r.json()) } = {}) {
  const el = ensure(); closeTimers();
  const my = ++gen, current = () => my === gen && !el.hidden; // false once the viewer switched agents or closed
  if (el.hidden) lastFocus = document.activeElement; // switching agents keeps the focus to return to on close
  const badge = el.querySelector('.sv-live'), kind = agent.pipId ? 'live' : agent.frames?.length ? 'recorded' : 'simulated';
  badge.dataset.kind = kind; badge.textContent = { live: 'LIVE', recorded: 'RECORDED', simulated: 'SIMULATED' }[kind];
  el.style.setProperty('--c', agent.fluid || '#62e6cf');
  el.querySelector('.sv-name').textContent = `${agent.name || 'Agent'}'s screen`;
  el.querySelector('.sv-sub').textContent = agent.pipId ? 'Live from its own browser' : 'Sample agent · simulated page';
  const page = el.querySelector('.sv-page'), url = el.querySelector('.sv-url'), note = el.querySelector('.sv-note'), thumbs = el.querySelector('.sv-thumbs');
  page.innerHTML = ''; thumbs.innerHTML = ''; note.textContent = '';
  const deskEl = el.querySelector('.sv-desk'); deskEl.hidden = !agent.pipId; deskEl.innerHTML = agent.pipId ? '<h3>TRADING DESK</h3><p class="why mu">Loading its trades…</p>' : ''; el.querySelector('.sv-main').classList.toggle('has-desk', !!agent.pipId);
  el.hidden = false; el.querySelector('.sv-x').focus();

  if (!agent.pipId && agent.frames?.length) { // demo: a recorded real session plays back
    el.querySelector('.sv-sub').textContent = 'Demo · a real browsing session, recorded';
    let i = 0; const frames = agent.frames;
    thumbs.innerHTML = frames.map((f) => `<button title="${esc(f.note || '')} · ${esc(host(f.url))}"><img src="${esc(src(f.img))}" alt=""></button>`).join('');
    const show = (k) => {
      i = (k + frames.length) % frames.length; const f = frames[i];
      url.textContent = host(f.url); note.textContent = `${(f.note || '')[0]?.toUpperCase() || ''}${(f.note || '').slice(1)}${f.title ? ` · ${f.title}` : ''}`;
      const img = new Image(); img.src = src(f.img); img.alt = f.title || 'its screen'; img.className = 'in';
      const old = [...page.querySelectorAll('img')]; page.appendChild(img);
      requestAnimationFrame(() => requestAnimationFrame(() => { if (!current()) return; img.className = ''; old.forEach((o) => { o.className = 'out'; setTimeout(() => o.remove(), 520); }); }));
      thumbs.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
    };
    thumbs.querySelectorAll('button').forEach((b, n) => b.addEventListener('click', () => { if (!current()) return; clearInterval(timer); show(n); timer = setInterval(() => show(i + 1), 1800); }));
    show(0); timer = setInterval(() => show(i + 1), 1800);
    return;
  }
  if (!agent.pipId) { // simulated: scroll the booth's fake page
    url.textContent = 'the web';
    note.textContent = 'Sample agents browse a pretend web. Real agents show their own live browser here.';
    const src = agent.sim?.(); if (!src) { page.innerHTML = '<div class="sv-empty">Nothing on screen yet.</div>'; return; }
    const cv = document.createElement('canvas'); cv.width = src.width; cv.height = Math.round(src.width * 10 / 16); page.appendChild(cv);
    const x = cv.getContext('2d'); let y = 0;
    const tick = () => { if (!current()) return; y = (y + 1.2) % Math.max(1, src.height - cv.height); x.drawImage(src, 0, y, cv.width, cv.height, 0, 0, cv.width, cv.height); raf = requestAnimationFrame(tick); };
    tick(); return;
  }

  // live: play its latest session like a person at the PC. Each frame says what it did (type, open, scroll, click,
  // back) and where its cursor was; the cursor glides there, clicks ripple, searches type out in the address bar and
  // scrolls move the page by the real distance. A new session takes over when the current one finishes.
  let frames = [], i = -1, key = '', next = null, loading = false, stepT = 0;
  const cursor = document.createElement('div'); cursor.className = 'sv-cur'; cursor.innerHTML = CURSOR;
  const pill = document.createElement('div'); pill.className = 'sv-act';
  const preload = (list) => Promise.all(list.map((f) => new Promise((ok) => { const im = new Image(); im.onload = im.onerror = () => ok(); im.src = src(f.img); })));
  const typeUrl = (text, then) => { let n = 0; url.textContent = ''; const go = () => { if (!current()) return; url.textContent = text.slice(0, ++n) + (n < text.length ? '▍' : ''); if (n < text.length) stepT = setTimeout(go, 45 + Math.random() * 50); else then(); }; go(); };
  const label = (f, a) => a.act === 'type' ? `Typing “${a.text || ''}”` : a.act === 'click' ? `Clicking “${(a.text || f.note.replace(/^clicking /, '')).replace(/[“”]/g, '')}”` : a.act === 'back' ? 'Going back to the results' : a.act === 'scroll' ? (f.note === 'reading' ? `Reading ${host(f.url).split('/')[0].replace(/^www\./, '')}` : 'Scrolling') : f.note ? f.note[0].toUpperCase() + f.note.slice(1) : 'Browsing';
  const place = (a) => { cursor.style.left = (a.cx ?? .5) * 100 + '%'; cursor.style.top = (a.cy ?? .45) * 100 + '%'; };
  const ripple = () => { const r = document.createElement('i'); r.className = 'sv-rip'; r.style.left = cursor.style.left; r.style.top = cursor.style.top; page.appendChild(r); setTimeout(() => r.remove(), 700); };
  function swap(f, a) { // put frame f on screen; a scroll slides old and new by the real distance
    const img = new Image(); img.src = src(f.img); img.alt = f.title || 'its screen';
    const old = [...page.querySelectorAll('img')], h = page.clientHeight, off = a.act === 'scroll' ? Math.min(h, (a.dy || 400) * h / 800) : 0;
    img.style.transition = 'none'; img.style.transform = off ? `translateY(${off}px)` : ''; img.style.opacity = off ? '1' : '0';
    page.insertBefore(img, cursor);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!current()) return;
      img.style.transition = ''; img.style.transform = ''; img.style.opacity = '1';
      old.forEach((o) => { o.style.transform = off ? `translateY(${-off}px)` : ''; o.style.opacity = off ? '1' : '0'; setTimeout(() => o.remove(), 650); });
    }));
  }
  function play() {
    if (!current()) return;
    if (i + 1 >= frames.length) { // session over: the next one when it arrives; until then it stays on this page, reading (never replays)
      if (next) { frames = next.frames; key = next.key; next = null; renderThumbs(); i = -1; stepT = setTimeout(play, 600); return; }
      const f = frames[i], a = f?.act || {};
      if (f) { pill.textContent = `Reading ${host(f.url).split('/')[0].replace(/^www\./, '')}`; pill.dataset.act = 'read'; place({ cx: Math.min(.9, Math.max(.1, (a.cx ?? .5) + (Math.random() - .5) * .08)), cy: Math.min(.85, Math.max(.15, (a.cy ?? .45) + (Math.random() - .5) * .06)) }); }
      stepT = setTimeout(play, 1800); return;
    }
    const f = frames[++i], a = f.act || { act: f.step === 0 ? 'open' : 'scroll', cx: .5, cy: .45 };
    thumbs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === String(f.id)));
    note.textContent = f.title || '';
    pill.textContent = label(f, a); pill.dataset.act = a.act;
    place(a);
    if (a.act === 'type') { typeUrl(a.text || '', () => { url.textContent = host(f.url); ripple(); swap(f, a); stepT = setTimeout(play, 2200); }); return; }
    if (a.act === 'click') { stepT = setTimeout(() => { swap(f, a); ripple(); stepT = setTimeout(play, 1500); }, 650); url.textContent = host(f.url); return; }
    url.textContent = host(f.url); swap(f, a);
    stepT = setTimeout(play, a.act === 'scroll' ? 2600 + Math.random() * 1000 : 3000); // slow, careful reading
  }
  function renderThumbs() {
    thumbs.innerHTML = frames.map((f) => `<button data-id="${f.id}" title="${esc(f.note || '')} · ${esc(host(f.url))}"><img src="${esc(src(f.img))}" alt="" loading="lazy"></button>`).join('');
    thumbs.querySelectorAll('button').forEach((b, n) => b.addEventListener('click', () => { if (!current()) return; clearTimeout(stepT); i = n - 1; play(); }));
  }
  const load = async () => {
    if (loading || !current()) return; // a slow poll is still out: skip this one rather than stack them
    loading = true;
    let j; try { j = await api(`/api/agents/${agent.pipId}/screens`); } catch { return; } finally { loading = false; }
    if (!current() || !j) return; // the viewer moved on while this was in flight
    const s = session(j.frames || []), k = s.map((f) => f.id).join(',');
    if (!s.length) { if (!frames.length) { page.innerHTML = '<div class="sv-empty">Its browser is warming up. Screens appear here as it searches and scrolls.</div>'; url.textContent = 'about:blank'; } return; }
    if (k === key || k === next?.key) return;
    await preload(s); if (!current()) return;
    if (!frames.length) { frames = s; key = k; page.innerHTML = ''; page.append(cursor, pill); renderThumbs(); play(); }
    else next = { frames: s, key: k };
  };
  // the trading desk: wallet, open positions with live P/L, latest trades and its latest thought
  let seen = null;
  const fmt = (v) => (v == null ? '—' : v >= 1 ? v.toFixed(2) : v >= .01 ? v.toFixed(3) : v.toFixed(4));
  const ago = (at) => { const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000); return s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : Math.round(s / 3600) + 'h'; };
  const loadDesk = async () => {
    let list, me; try { [list, me] = await Promise.all([api('/api/desks'), api(`/api/agents/${agent.pipId}`)]); } catch { return; }
    if (!current()) return;
    const d = (Array.isArray(list) ? list : []).find((x) => x.id === agent.pipId); if (!d) return;
    const thought = (me?.feed || []).find((f) => f.kind === 'thought'), strat = me?.strategy;
    const pos = d.positions.map((p) => `<a class="row" href="${esc(p.link)}" target="_blank" rel="noopener"><b>$${esc(p.symbol)}</b><span class="mu">${fmt(p.costSol)} → ${fmt(p.valueSol)}</span><span class="${p.pnlPct == null ? 'mu' : p.pnlPct >= 0 ? 'up' : 'dn'}">${p.pnlPct == null ? '—' : (p.pnlPct >= 0 ? '+' : '') + p.pnlPct + '%'}</span></a>`).join('') || '<p class="why mu">Flat right now, scanning for its next entry.</p>';
    const trs = d.trades.map((tr, n) => `<a class="tr${seen && !seen.has(tr.at) ? ' new' : ''}" href="${esc(tr.link || '#')}" target="_blank" rel="noopener" title="${esc(tr.text)}"><span class="s-${esc(tr.side)}">${esc(tr.side.toUpperCase())}</span><span class="t">${tr.symbol ? '$' + esc(tr.symbol) : tr.side === 'fees' ? 'creator fees in' : esc(tr.text)}${tr.sol != null ? ' · ' + fmt(tr.sol) + ' SOL' : ''}</span><span class="mu">${ago(tr.at)}</span></a>`).join('') || '<p class="why mu">No trades yet.</p>';
    seen = new Set(d.trades.map((tr) => tr.at));
    deskEl.innerHTML = `<h3>TRADING DESK <span>${fmt(d.walletSol)} SOL</span></h3>${strat ? `<p class="why"><b style="color:#ece8ff">${esc(strat.label)}</b> · ${esc(strat.directive).slice(0, 140)}</p>` : ''}<h4>OPEN POSITIONS</h4>${pos}<h4>LATEST TRADES</h4>${trs}${thought ? `<h4>THINKING · ${ago(thought.at)} AGO</h4><p class="why">${esc(thought.text)}</p>` : ''}`;
  };
  load(); loadDesk(); poll = setInterval(() => { load(); loadDesk(); }, 4000);
  stop = () => clearTimeout(stepT);
}
function closeTimers() { clearInterval(timer); clearInterval(poll); cancelAnimationFrame(raf); stop(); stop = () => {}; }
export function closeScreenView() { if (!root || root.hidden) return; gen++; closeTimers(); root.hidden = true; lastFocus?.focus?.(); }
export const screenViewOpen = () => !!root && !root.hidden;
