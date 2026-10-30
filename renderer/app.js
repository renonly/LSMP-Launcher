const $ = (id) => document.getElementById(id);
const api = window.lsmp;
const state = { cfg: null, s: null, session: null, status: null, busy: false, running: false, pack: null, shot: null };
const COLORS = ["#4ade80", "#38bdf8", "#a78bfa", "#f472b6", "#fb923c", "#facc15", "#f87171", "#2dd4bf"];

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2600);
}
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const fmtDate = (d) => new Date(d).toLocaleDateString("pt-BR");
const fmtHours = (ms) => { const m = Math.floor(ms / 60000); return m < 60 ? `${m} min` : `${(m / 60).toFixed(1).replace(".0", "")} h`; };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// logos opcionais: some se o arquivo não existir (onerror inline é bloqueado pela CSP)
document.querySelectorAll("img.logo, img.logo-sm").forEach((img) => {
  const drop = () => img.remove();
  img.addEventListener("error", drop);
  if (img.complete && img.naturalWidth === 0) drop();
});

// ---------- navegação ----------
function go(tab) {
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.dataset.view !== tab));
  if (tab === "pack") loadPack();
  if (tab === "news") loadNews();
  if (tab === "shots") loadShots();
}
$("nav").onclick = (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); };
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-goto]"); if (g) go(g.dataset.goto);
  const w = e.target.closest("[data-win]"); if (w) api.win(w.dataset.win);
  if (e.target.closest("[data-open-dir]")) api.openGameDir();
});
$("subtabs").onclick = (e) => {
  const b = e.target.closest("button"); if (!b) return;
  document.querySelectorAll("#subtabs button").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll(".sub-pane").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.sub));
};

// ---------- login ----------
let registering = false;
function setMode(reg) {
  registering = reg;
  $("auth-title").textContent = reg ? "Criar conta" : "Entrar";
  $("auth-submit").textContent = reg ? "Criar conta" : "Entrar";
  $("auth-toggle").textContent = reg ? "Já tenho conta" : "Criar uma conta";
  $("p2-wrap").hidden = !reg; $("auth-error").textContent = "";
}
$("auth-toggle").onclick = () => setMode(!registering);
async function submitAuth() {
  const u = $("u").value.trim(), p = $("p").value;
  $("auth-error").textContent = "";
  if (!u || !p) return ($("auth-error").textContent = "Preencha usuário e senha.");
  if (registering && p !== $("p2").value) return ($("auth-error").textContent = "As senhas não são iguais.");
  $("auth-submit").disabled = true;
  const r = await (registering ? api.register(u, p) : api.login(u, p));
  $("auth-submit").disabled = false;
  if (!r.ok) return ($("auth-error").textContent = r.error);
  $("p").value = $("p2").value = "";
  enter(r.data);
}
$("auth-submit").onclick = submitAuth;
["u", "p", "p2"].forEach((id) => $(id).addEventListener("keydown", (e) => e.key === "Enter" && submitAuth()));
$("logout").onclick = async () => { await api.logout(); state.session = null; $("app").hidden = true; $("auth").hidden = false; };

function enter(session) {
  state.session = session;
  $("auth").hidden = true; $("app").hidden = false;
  $("who").textContent = session.username;
  $("avatar").textContent = session.username[0].toUpperCase();
  go("play"); refreshStatus(); loadNews(true); loadPackChip();
}

// ---------- aparência ----------
function applyLook(s) {
  const r = document.documentElement.style;
  r.setProperty("--accent", s.accent);
  r.setProperty("--blur", s.bgBlur + "px");
  r.setProperty("--dim", s.bgDim / 100);
  $("bg").style.backgroundImage = s.bgUrl ? `url("${s.bgUrl}")` : "";
  document.querySelectorAll(".swatches button").forEach((b) => b.classList.toggle("on", b.dataset.c === s.accent.toLowerCase()));
}

// ---------- status do servidor (só ícones, sem IP) ----------
async function refreshStatus() {
  const st = await api.status();
  state.status = st;
  $("srv-dot").className = "dot " + (st.online ? "on" : "off");
  $("t-players").textContent = st.online ? `${st.players}/${st.max}` : "Offline";
  $("t-ping").textContent = st.online ? st.ping + " ms" : "—";
}

// ---------- novidades ----------
async function loadNews(small) {
  const list = await api.news();
  if (list.length) {
    $("latest").hidden = false;
    $("latest-tag").textContent = list[0].tag;
    $("latest-title").textContent = list[0].name;
    $("latest-body").textContent = (list[0].body.replace(/[#*`>-]/g, "").split("\n").find((l) => l.trim()) || "").trim();
  }
  if (small) return;
  const box = $("news-list");
  if (!list.length) { box.innerHTML = ""; const p = document.createElement("p"); p.className = "note"; p.textContent = "Sem novidades por enquanto."; return box.append(p); }
  box.replaceChildren(...list.map((n) => {
    const d = document.createElement("div"); d.className = "news-item";
    const h = document.createElement("header");
    const t = document.createElement("span"); t.className = "tag"; t.textContent = n.tag;
    const b = document.createElement("b"); b.textContent = n.name;
    const dt = document.createElement("span"); dt.className = "d"; dt.textContent = fmtDate(n.date);
    h.append(t, b, dt);
    const pre = document.createElement("pre"); pre.textContent = n.body || "Sem descrição.";
    d.append(h, pre); return d;
  }));
}

// ---------- pack ----------
async function loadPackChip() {
  const r = await api.packInfo();
  if (r.ok) state.pack = r.data;
  return r;
}
async function loadPack() {
  const r = await loadPackChip();
  $("pack-error").textContent = r.ok ? "" : r.error;
  if (r.ok) renderPack();
}
function renderPack() {
  const p = state.pack; if (!p) return;
  const q = $("pack-search").value.toLowerCase(), f = $("pack-filter").value, so = $("pack-sort").value;
  const total = p.files.reduce((a, x) => a + x.size, 0), ok = p.files.filter((x) => x.installed).length;
  $("pack-stats").replaceChildren(...[`${p.files.length} arquivos`, fmtSize(total), `${ok} instalados`].map((t) => {
    const c = document.createElement("span"); c.className = "chip static"; c.textContent = t; return c;
  }));
  let files = p.files.filter((x) => x.path.toLowerCase().includes(q) && (f === "all" || (f === "ok") === x.installed));
  files.sort((a, b) => (so === "size" ? b.size - a.size : a.path.localeCompare(b.path)));
  $("pack-list").replaceChildren(...files.map((x) => {
    const d = document.createElement("div"); d.className = "item";
    const n = document.createElement("span"); n.className = "n"; n.textContent = x.path; n.title = x.path;
    const s = document.createElement("span"); s.className = "s"; s.textContent = fmtSize(x.size);
    const k = document.createElement("span"); k.className = x.installed ? "ok" : "miss"; k.textContent = x.installed ? "✓" : "✗";
    d.append(n, s, k); return d;
  }));
}
["pack-search", "pack-filter", "pack-sort"].forEach((id) => $(id).addEventListener("input", renderPack));

async function runSync(force) {
  if (state.busy) return;
  setBusy(true); $("game-error").textContent = ""; $("pack-error").textContent = "";
  const r = await api.sync(force);
  setBusy(false);
  if (!r.ok) { $("game-error").textContent = r.error; $("pack-error").textContent = r.error; }
  else toast(force ? "Arquivos reparados!" : "Pack atualizado!");
  loadPack();
}
$("repair").onclick = () => runSync(true);
$("play-repair").onclick = () => runSync(true);

// ---------- capturas ----------
async function loadShots() {
  const list = await api.shots();
  $("shots-empty").hidden = list.length > 0;
  $("shots-grid").replaceChildren(...list.map((s) => {
    const i = document.createElement("img"); i.src = s.url; i.loading = "lazy"; i.title = s.name;
    i.onclick = () => { state.shot = s; $("lb-img").src = s.url; $("lightbox").hidden = false; };
    return i;
  }));
}
$("shots-refresh").onclick = loadShots; $("shots-open").onclick = () => api.openShots();
$("lb-close").onclick = () => ($("lightbox").hidden = true);
$("lightbox").onclick = (e) => { if (e.target.id === "lightbox") $("lightbox").hidden = true; };
$("lb-show").onclick = () => state.shot && api.showShot(state.shot.path);

// ---------- jogar ----------
function setBusy(b) {
  state.busy = b;
  $("play").disabled = b || state.running; $("repair").disabled = b; $("play-repair").disabled = b;
  $("progress").hidden = !b && !state.running;
  if (!b && !state.running) $("bar-fill").style.width = "0";
}
function setRunning(r) {
  state.running = r; $("play").hidden = r; $("stop").hidden = !r; $("play-repair").disabled = r;
  $("play").disabled = state.busy || r;
}
api.on("progress", (p) => {
  $("progress").hidden = false;
  $("stage").textContent = p.stage; $("file").textContent = p.file || "";
  $("bar-fill").style.width = p.total ? Math.min(100, (p.done / p.total) * 100) + "%" : "100%";
});
const logEl = $("log");
api.on("log", (l) => {
  logEl.append(l + "\n");
  if (logEl.textContent.length > 300000) logEl.textContent = logEl.textContent.slice(-200000);
  logEl.scrollTop = logEl.scrollHeight;
});
api.on("started", () => { setBusy(false); setRunning(true); $("progress").hidden = true; });
api.on("closed", (code) => {
  setRunning(false); setBusy(false);
  if (code) { $("game-error").textContent = `O jogo fechou com erro (código ${code}). Veja a aba Console.`; }
});
$("play").onclick = async () => {
  if (state.busy || state.running) return;
  $("game-error").textContent = ""; setBusy(true);
  const r = await api.play();
  if (!r.ok) { setBusy(false); $("game-error").textContent = r.error; }
};
$("stop").onclick = () => api.stop();
$("log-copy").onclick = () => { api.copy(logEl.textContent); toast("Log copiado!"); };
$("log-clear").onclick = () => (logEl.textContent = "");

// ---------- ajustes ----------
function fillSettings(s) {
  state.s = s;
  $("ram").value = $("s-ram").value = s.ramGb;
  $("ram-val").textContent = $("s-ram-val").textContent = s.ramGb;
  $("s-fullscreen").checked = s.fullscreen;
  $("s-width").value = s.width || ""; $("s-height").value = s.height || "";
  $("s-onlaunch").value = s.onLaunch; $("s-java").value = s.javaPath;
  $("s-preset").value = s.jvmPreset; $("s-jvm").value = s.jvmArgs;
  $("s-startup").checked = s.launchAtStartup; $("s-accent").value = s.accent;
  $("s-blur").value = s.bgBlur; $("s-blur-val").textContent = s.bgBlur;
  $("s-dim").value = s.bgDim; $("s-dim-val").textContent = s.bgDim;
  applyLook(s);
}
const save = debounce(async (patch) => { fillSettingsLight(await api.setSettings(patch)); }, 250);
function fillSettingsLight(s) { state.s = s; applyLook(s); }
const set = (patch) => { Object.assign(state.s, patch); applyLook(state.s); save(patch); };

function ramSync(v) {
  $("ram").value = $("s-ram").value = v; $("ram-val").textContent = $("s-ram-val").textContent = v;
  set({ ramGb: Number(v) });
  const rec = Math.max(2, Math.min(8, Math.floor(state.cfg.totalRam / 2)));
  $("s-ram-hint").textContent = Number(v) > state.cfg.totalRam * 0.75 ? "(muito alto pro seu PC)" : `(recomendado: ${rec} GB)`;
}
$("ram").oninput = (e) => ramSync(e.target.value);
$("s-ram").oninput = (e) => ramSync(e.target.value);
$("s-fullscreen").onchange = (e) => set({ fullscreen: e.target.checked });
$("s-width").oninput = (e) => set({ width: +e.target.value || 0 });
$("s-height").oninput = (e) => set({ height: +e.target.value || 0 });
$("s-onlaunch").onchange = (e) => set({ onLaunch: e.target.value });
$("s-java").oninput = (e) => set({ javaPath: e.target.value });
$("s-preset").onchange = (e) => set({ jvmPreset: e.target.value });
$("s-jvm").oninput = (e) => set({ jvmArgs: e.target.value });
$("s-startup").onchange = (e) => set({ launchAtStartup: e.target.checked });
$("s-accent").oninput = (e) => set({ accent: e.target.value });
$("s-blur").oninput = (e) => { $("s-blur-val").textContent = e.target.value; set({ bgBlur: +e.target.value }); };
$("s-dim").oninput = (e) => { $("s-dim-val").textContent = e.target.value; set({ bgDim: +e.target.value }); };
$("swatches").replaceChildren(...COLORS.map((c) => {
  const b = document.createElement("button"); b.dataset.c = c; b.style.background = c; b.title = c;
  b.onclick = () => { $("s-accent").value = c; set({ accent: c }); }; return b;
}));
$("bg-quick").onclick = async () => fillSettings(await api.chooseBg());
$("bg-choose").onclick = async () => fillSettings(await api.chooseBg());
$("bg-clear").onclick = async () => fillSettings(await api.clearBg());
$("reset-settings").onclick = async () => { fillSettings(await api.resetSettings()); toast("Ajustes restaurados."); };
$("open-data").onclick = () => api.openData();
$("open-log").onclick = () => api.openLog();
$("java-browse").onclick = async () => { const p = await api.chooseJava(); if (p) { $("s-java").value = p; set({ javaPath: p }); } };
$("java-detect").onclick = async () => {
  const box = $("java-list"); box.textContent = "Procurando…";
  const list = await api.detectJava();
  if (!list.length) return (box.textContent = "Nenhum Java encontrado. Instale o Java 21 (Temurin).");
  box.replaceChildren(...list.map((j) => {
    const b = document.createElement("button"); b.textContent = `Java ${j.major} — ${j.path}`; b.title = j.path;
    b.onclick = () => { $("s-java").value = j.path; set({ javaPath: j.path }); toast(`Java ${j.major} selecionado`); };
    return b;
  }));
};

// ---------- auto-update do launcher ----------
const UPD_TEXT = {
  checking: () => "Procurando atualizações…",
  downloading: (u) => `Baixando v${u.version}… ${u.percent || 0}%`,
  ready: (u) => `v${u.version} pronta para instalar.`,
  manual: (u) => `Nova versão v${u.version} disponível.`,
  error: (u) => u.message || "Erro ao atualizar.",
};
function showUpdate(u) {
  state.upd = u;
  const box = $("upd"), btn = $("upd-btn");
  const text = UPD_TEXT[u.state]?.(u);
  box.hidden = !text || u.state === "checking";
  box.classList.toggle("err", u.state === "error");
  $("upd-text").textContent = text || "";
  $("upd-bar").hidden = u.state !== "downloading";
  $("upd-fill").style.width = (u.percent || 0) + "%";
  btn.hidden = !["ready", "manual"].includes(u.state);
  btn.textContent = u.state === "ready" ? "Reiniciar e atualizar" : "Baixar atualização";
  const detail = {
    idle: "Ainda não verificado.", checking: "Verificando…", none: "Você está na versão mais recente. ✓",
    dev: "Auto-update só funciona no app instalado (não no npm start).",
  }[u.state] || text || "";
  $("upd-detail").textContent = detail;
  $("upd-check").disabled = ["checking", "downloading"].includes(u.state);
}
$("upd-btn").onclick = () => {
  const u = state.upd;
  if (u.state === "ready") api.installUpdate();
  else if (u.state === "manual") api.openExternal(u.url);
};
$("upd-check").onclick = async () => showUpdate(await api.updateCheck());
api.onUpdate(showUpdate);

// ---------- início ----------
(async function init() {
  state.cfg = await api.config();
  document.title = state.cfg.name;
  $("brand-name").textContent = state.cfg.name; $("hero-name").textContent = state.cfg.name;
  $("s-ram").max = $("ram").max = state.cfg.maxRam;
  $("about").textContent = `${state.cfg.name} Launcher v${state.cfg.version}`;
  fillSettings(await api.getSettings());
  ramSync(state.s.ramGb);
  showUpdate(await api.updateState()); // pega o estado atual (evita perder eventos)
  setInterval(() => state.session && refreshStatus(), 30000);
  const session = await api.session();
  if (session) enter(session);
})();
