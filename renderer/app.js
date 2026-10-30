const $ = (id) => document.getElementById(id);
let mode = "login";
let busy = false;          // jogo rodando ou pack sendo verificado
let hostLabel = "";
let settings = null;

/* ---------- janela / telas ---------- */
document.querySelectorAll("[data-win]").forEach((b) =>
  b.addEventListener("click", () => api.win(b.dataset.win))
);

function show(screen) {
  $("auth").hidden = screen !== "auth";
  $("home").hidden = screen !== "home";
  $("tabs").hidden = screen !== "home";
}

function showTab(name) {
  document.querySelectorAll("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  if (name === "pack") loadPack();
  if (name === "console") scrollLog(true);
}
document.querySelectorAll("[data-tab]").forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.tab))
);

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth; // reinicia a animação
  el.classList.add("shake");
}

const fmtBytes = (n) =>
  n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;

/* ---------- login / cadastro ---------- */
function setMode(m) {
  mode = m;
  const reg = m === "register";
  $("auth-title").textContent = reg ? "Criar conta" : "Entrar";
  $("auth-submit").textContent = reg ? "Criar conta" : "Entrar";
  $("auth-toggle").textContent = reg ? "Já tenho conta" : "Criar uma conta";
  $("p2-wrap").hidden = !reg;
  $("auth-error").textContent = "";
}

async function submitAuth() {
  const u = $("u").value.trim();
  const p = $("p").value;
  const err = (t) => {
    $("auth-error").textContent = t;
    if (t) shake($("card"));
  };
  err("");
  if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) return err("Usuário: 3 a 16 letras, números ou _.");
  if (p.length < 8) return err("A senha precisa ter pelo menos 8 caracteres.");
  if (mode === "register" && p !== $("p2").value) return err("As senhas não são iguais.");

  const btn = $("auth-submit");
  btn.disabled = true;
  btn.classList.add("busy");
  const r = await (mode === "register" ? api.register(u, p) : api.login(u, p));
  btn.disabled = false;
  btn.classList.remove("busy");
  if (!r.ok) return err(r.error);
  $("p").value = $("p2").value = "";
  enterHome(r.data);
}

let statusTimer = null;
function enterHome(s) {
  $("who").textContent = s.username;
  show("home");
  showTab("play");
  refreshStatus();
  refreshPackChip();
  clearInterval(statusTimer);
  statusTimer = setInterval(refreshStatus, 30000);
}

/* ---------- status do servidor ---------- */
async function refreshStatus() {
  const dot = $("srv-dot"), text = $("srv-text");
  const s = await api.status();
  if (s.online) {
    dot.className = "dot online";
    text.textContent = `${hostLabel} · ${s.players}/${s.max} online · ${s.ping} ms`;
  } else {
    dot.className = "dot offline";
    text.textContent = `${hostLabel} · offline`;
  }
}
$("srv").addEventListener("click", () => {
  api.copy(hostLabel);
  const text = $("srv-text"), old = text.textContent;
  text.textContent = "IP copiado!";
  setTimeout(() => (text.textContent = old), 1400);
});

/* ---------- jogar ---------- */
function setProgress({ stage, done, total, file }) {
  $("progress").hidden = false;
  $("stage").textContent = stage;
  $("file").textContent = file || "";
  $("bar-fill").style.width = total ? `${Math.min(100, (done / total) * 100)}%` : "0%";
}

function setBusy(on, label) {
  busy = on;
  $("play").disabled = on;
  $("play").classList.toggle("busy", on);
  $("play").textContent = on ? label || "Preparando…" : "Jogar";
  $("repair").disabled = on;
}

async function play() {
  $("game-error").textContent = "";
  setBusy(true, "Preparando…");
  const r = await api.play();
  if (!r.ok) {
    $("game-error").textContent = r.error;
    $("progress").hidden = true;
    setBusy(false);
  }
}

api.on("progress", setProgress);
api.on("started", () => setBusy(true, "Jogando…"));
api.on("closed", (code) => {
  setBusy(false);
  $("progress").hidden = true;
  if (code) $("game-error").textContent = `O jogo fechou com erro (código ${code}). Veja a aba Console.`;
});

$("play").addEventListener("click", play);

/* ---------- pack ---------- */
let packFiles = [];

async function refreshPackChip() {
  const r = await api.packInfo();
  $("pack-chip").textContent = r.ok
    ? `Pack ${r.data.version} · ${r.data.files.length} arquivos${r.data.offline ? " (offline)" : ""}`
    : "Pack não publicado";
}

async function loadPack() {
  $("pack-error").textContent = "";
  const r = await api.packInfo();
  if (!r.ok) {
    $("pack-error").textContent = r.error;
    packFiles = [];
    $("pack-stats").replaceChildren();
    renderPackList();
    return;
  }
  const d = r.data;
  packFiles = d.files;
  const total = d.files.reduce((n, f) => n + f.size, 0);
  const mods = d.files.filter((f) => f.path.startsWith("mods/")).length;
  const stats = [
    ["Versão do pack", d.version],
    ["Minecraft", d.minecraft || "?"],
    ["Fabric", d.loader?.version || "?"],
    ["Mods", String(mods)],
    ["Tamanho", fmtBytes(total)],
  ];
  $("pack-stats").replaceChildren(
    ...stats.map(([k, v]) => {
      const el = document.createElement("div");
      el.className = "stat";
      const s = document.createElement("span"); s.textContent = k;
      const b = document.createElement("b"); b.textContent = v;
      el.append(s, b);
      return el;
    })
  );
  renderPackList();
}

function renderPackList() {
  const q = $("pack-search").value.trim().toLowerCase();
  const rows = packFiles.filter((f) => f.path.toLowerCase().includes(q));
  const list = $("pack-list");
  if (!rows.length) {
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = packFiles.length ? "Nada encontrado." : "Nenhum arquivo no pack.";
    return list.replaceChildren(e);
  }
  list.replaceChildren(
    ...rows.map((f) => {
      const row = document.createElement("div");
      row.className = "item";
      const name = document.createElement("span"); name.className = "name"; name.textContent = f.path;
      name.title = f.path;
      const size = document.createElement("span"); size.className = "meta"; size.textContent = fmtBytes(f.size);
      const tag = document.createElement("span");
      tag.className = `tag ${f.installed ? "ok" : "miss"}`;
      tag.textContent = f.installed ? "instalado" : "faltando";
      row.append(name, size, tag);
      return row;
    })
  );
}
$("pack-search").addEventListener("input", renderPackList);

$("repair").addEventListener("click", async () => {
  if (busy) return;
  showTab("play");
  $("game-error").textContent = "";
  setBusy(true, "Verificando…");
  const r = await api.sync(true);
  setBusy(false);
  if (!r.ok) {
    $("progress").hidden = true;
    $("game-error").textContent = r.error;
  }
  refreshPackChip();
});

document.querySelectorAll("[data-open-dir]").forEach((b) =>
  b.addEventListener("click", () => api.openGameDir())
);

/* ---------- console ---------- */
const MAX_LINES = 1500;
const logEl = $("log");
function scrollLog(force) {
  const near = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 80;
  if (force || near) logEl.scrollTop = logEl.scrollHeight;
}
api.on("log", (line) => {
  logEl.append(line + "\n");
  while (logEl.childNodes.length > MAX_LINES) logEl.removeChild(logEl.firstChild);
  scrollLog(false);
});
$("log-clear").addEventListener("click", () => (logEl.textContent = ""));
$("log-copy").addEventListener("click", () => api.copy(logEl.textContent));

/* ---------- ajustes ---------- */
function applySettingsToUI(s) {
  settings = s;
  $("ram").value = $("s-ram").value = s.ramGb;
  $("ram-val").textContent = $("s-ram-val").textContent = s.ramGb;
  $("s-fullscreen").checked = s.fullscreen;
  $("s-width").value = s.width || "";
  $("s-height").value = s.height || "";
  $("s-java").value = s.javaPath;
  $("s-jvm").value = s.jvmArgs;
  $("s-min").checked = s.minimizeOnLaunch;
  $("s-width").disabled = $("s-height").disabled = s.fullscreen;
}

async function saveSettings(patch) {
  applySettingsToUI(await api.setSettings(patch));
}

// slider de RAM (tela inicial e ajustes andam juntos)
for (const id of ["ram", "s-ram"]) {
  $(id).addEventListener("input", () => {
    $("ram-val").textContent = $("s-ram-val").textContent = $(id).value;
    $("ram").value = $("s-ram").value = $(id).value;
  });
  $(id).addEventListener("change", () => saveSettings({ ramGb: Number($(id).value) }));
}
$("s-fullscreen").addEventListener("change", () => saveSettings({ fullscreen: $("s-fullscreen").checked }));
$("s-min").addEventListener("change", () => saveSettings({ minimizeOnLaunch: $("s-min").checked }));
$("s-width").addEventListener("change", () => saveSettings({ width: Number($("s-width").value) || 0 }));
$("s-height").addEventListener("change", () => saveSettings({ height: Number($("s-height").value) || 0 }));
$("s-java").addEventListener("change", () => saveSettings({ javaPath: $("s-java").value }));
$("s-jvm").addEventListener("change", () => saveSettings({ jvmArgs: $("s-jvm").value }));

/* ---------- eventos gerais ---------- */
$("auth-submit").addEventListener("click", submitAuth);
$("auth-toggle").addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
["u", "p", "p2"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => e.key === "Enter" && submitAuth())
);
$("logout").addEventListener("click", async () => {
  clearInterval(statusTimer);
  await api.logout();
  show("auth");
});

api.onUpdate(({ state, version }) => {
  $("update").hidden = false;
  if (state === "downloading") {
    $("update-text").textContent = `Baixando atualização ${version}…`;
  } else if (state === "ready") {
    $("update-text").textContent = `Atualização ${version} pronta.`;
    $("update-btn").hidden = false;
  }
});
$("update-btn").addEventListener("click", () => api.installUpdate());

/* ---------- início ---------- */
(async () => {
  const cfg = await api.config();
  hostLabel = cfg.port && String(cfg.port) !== "25565" ? `${cfg.host}:${cfg.port}` : cfg.host;
  $("hero-name").textContent = cfg.name;
  $("hero-sub").textContent = `Minecraft ${cfg.mc} com Fabric`;
  for (const id of ["ram", "s-ram"]) $(id).max = cfg.maxRam;
  $("s-ram-hint").textContent = `(seu PC tem ${cfg.maxRam} GB)`;
  $("about").textContent = `${cfg.name} Launcher v${cfg.version}`;
  applySettingsToUI(await api.getSettings());
  const s = await api.session();
  s ? enterHome(s) : show("auth");
})();
