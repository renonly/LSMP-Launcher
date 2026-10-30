const $ = (id) => document.getElementById(id);
let mode = "login";

document.querySelectorAll("[data-win]").forEach((b) =>
  b.addEventListener("click", () => api.win(b.dataset.win))
);

function show(screen) {
  $("auth").hidden = screen !== "auth";
  $("home").hidden = screen !== "home";
}

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
  const err = (t) => ($("auth-error").textContent = t);
  err("");
  if (!/^[A-Za-z0-9_]{3,16}$/.test(u)) return err("Usuário: 3 a 16 letras, números ou _.");
  if (p.length < 8) return err("A senha precisa ter pelo menos 8 caracteres.");
  if (mode === "register" && p !== $("p2").value) return err("As senhas não são iguais.");

  $("auth-submit").disabled = true;
  const r = await (mode === "register" ? api.register(u, p) : api.login(u, p));
  $("auth-submit").disabled = false;
  if (!r.ok) return err(r.error);
  $("p").value = $("p2").value = "";
  enterHome(r.data);
}

function enterHome(s) {
  $("who").textContent = s.username;
  $("avatar").textContent = s.username[0].toUpperCase();
  show("home");
}

function setProgress({ stage, done, total, file }) {
  $("progress").hidden = false;
  $("stage").textContent = stage;
  $("file").textContent = file || "";
  $("bar-fill").style.width = total ? `${Math.min(100, (done / total) * 100)}%` : "0%";
}

function resetPlay() {
  $("play").disabled = false;
  $("play").textContent = "Jogar";
}

async function play() {
  $("game-error").textContent = "";
  $("play").disabled = true;
  $("play").textContent = "Preparando…";
  const r = await api.play(Number($("ram").value));
  if (!r.ok) {
    $("game-error").textContent = r.error;
    resetPlay();
  }
}

$("auth-submit").addEventListener("click", submitAuth);
$("auth-toggle").addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
["u", "p", "p2"].forEach((id) =>
  $(id).addEventListener("keydown", (e) => e.key === "Enter" && submitAuth())
);
$("logout").addEventListener("click", async () => { await api.logout(); show("auth"); });
$("play").addEventListener("click", play);
$("ram").addEventListener("input", () => ($("ram-val").textContent = $("ram").value));

api.on("progress", setProgress);
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
api.on("closed", () => { resetPlay(); $("progress").hidden = true; });

(async () => {
  const cfg = await api.config();
  $("brand").textContent = cfg.name;
  $("hero-name").textContent = cfg.name;
  $("hero-sub").textContent = `Minecraft ${cfg.mc} com Fabric`;
  $("ram").value = cfg.ram;
  $("ram-val").textContent = cfg.ram;
  const s = await api.session();
  s ? enterHome(s) : show("auth");
})();
