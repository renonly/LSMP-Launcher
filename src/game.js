const { Client } = require("minecraft-launcher-core");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { app } = require("electron");
const cfg = require("./config");
const updater = require("./updater");

const gameDir = () => path.join(app.getPath("userData"), "instance");

// Baixa o profile do Fabric e deixa em versions/<id>/<id>.json
async function ensureFabric(root, mc, loader) {
  const id = `fabric-loader-${loader}-${mc}`;
  const jsonPath = path.join(root, "versions", id, `${id}.json`);
  if (!fs.existsSync(jsonPath)) {
    const url = `https://meta.fabricmc.net/v2/versions/loader/${mc}/${loader}/profile/json`;
    let res;
    try { res = await fetch(url, { signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error("Não consegui baixar o Fabric. Verifique sua internet."); }
    if (!res.ok) throw new Error("Não consegui baixar o Fabric.");
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, await res.text());
  }
  return id;
}

// Versão mínima do Java exigida pelo Minecraft
function requiredJava(mc) {
  const [, minor = "0", patch = "0"] = mc.split(".");
  const m = Number(minor), p = Number(patch);
  if (m > 20 || (m === 20 && p >= 5)) return 21;
  if (m >= 18) return 17;
  if (m === 17) return 16;
  return 8;
}

// Roda "java -version" e devolve a versão principal (ou null se não achar)
function javaMajor(javaPath) {
  const r = spawnSync(javaPath || "java", ["-version"], { encoding: "utf8", timeout: 8000 });
  if (r.error) return null;
  const m = /version "(\d+)(?:\.(\d+))?/.exec(`${r.stderr}${r.stdout}`);
  if (!m) return null;
  return m[1] === "1" ? Number(m[2]) : Number(m[1]);
}

const PRESETS = {
  none: [],
  g1: ["-XX:+UseG1GC", "-XX:MaxGCPauseMillis=100", "-XX:+UnlockExperimentalVMOptions",
       "-XX:+DisableExplicitGC", "-XX:G1NewSizePercent=20", "-XX:G1ReservePercent=20",
       "-XX:G1HeapRegionSize=32M"],
};

// Procura Javas instalados nos lugares comuns
function detectJava() {
  const found = new Map();
  const add = (p) => {
    if (!p || found.has(p) || !fs.existsSync(p)) return;
    const major = javaMajor(p);
    if (major) found.set(p, { path: p, major });
  };
  const exe = process.platform === "win32" ? "java.exe" : "java";
  if (process.env.JAVA_HOME) add(path.join(process.env.JAVA_HOME, "bin", exe));
  const roots = process.platform === "win32"
    ? ["C:\\Program Files\\Eclipse Adoptium", "C:\\Program Files\\Java", "C:\\Program Files\\Microsoft",
       "C:\\Program Files\\Zulu", "C:\\Program Files\\BellSoft", "C:\\Program Files\\Amazon Corretto"]
    : ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r)) {
      add(path.join(r, d, "bin", exe));
      add(path.join(r, d, "Contents", "Home", "bin", exe));
    }
  }
  return [...found.values()].sort((a, b) => b.major - a.major);
}

function checkJava(mc, javaPath) {
  const need = requiredJava(mc);
  const have = javaMajor(javaPath);
  if (have === null)
    throw new Error(`Java não encontrado. Instale o Java ${need} (Temurin) ou informe o caminho em Ajustes.`);
  if (have < need)
    throw new Error(`Seu Java é o ${have}, mas o Minecraft ${mc} precisa do Java ${need} ou mais novo.`);
}

// Só atualiza o pack (sem abrir o jogo). force = "Reparar arquivos".
async function syncOnly(force, send) {
  const root = gameDir();
  fs.mkdirSync(root, { recursive: true });
  if (force) {
    // força o Fabric a ser baixado de novo também
    const dir = path.join(root, "versions");
    if (fs.existsSync(dir))
      for (const d of fs.readdirSync(dir))
        if (d.startsWith("fabric-loader-")) fs.rmSync(path.join(dir, d), { recursive: true, force: true });
  }
  return updater.sync(root, (p) => send("progress", p), { force });
}

async function play(session, s, send) {
  const root = gameDir();
  fs.mkdirSync(root, { recursive: true });

  const manifest = await updater.sync(root, (p) => send("progress", p));
  // versão do Minecraft/Fabric vem do pack.json do repositório do modpack
  const mc = manifest.minecraft || cfg.MC_VERSION;
  const loader = manifest.loader?.version || cfg.FABRIC_LOADER;
  const loaderType = manifest.loader?.type || "fabric";
  if (loaderType !== "fabric")
    throw new Error(`Este pack usa ${loaderType}, mas o launcher só suporta Fabric por enquanto.`);

  send("progress", { stage: "Verificando o Java", done: 0, total: 0 });
  checkJava(mc, s.javaPath);
  const fabricId = await ensureFabric(root, mc, loader);

  const log = (m) => String(m).split(/\r?\n/).filter(Boolean).forEach((l) => send("log", l));
  const launcher = new Client();
  launcher.on("progress", (e) =>
    send("progress", { stage: `Baixando ${e.type}`, done: e.task, total: e.total })
  );
  launcher.on("debug", log);
  launcher.on("data", log);
  launcher.on("close", (code) => send("closed", code));

  const opts = {
    // Sessão do SMP: nome + UUID vindos da sua API.
    authorization: {
      access_token: session.token,
      client_token: session.uuid,
      uuid: session.uuid,
      name: session.username,
      user_properties: "{}",
      meta: { type: "mojang", demo: false },
    },
    root,
    version: { number: mc, type: "release", custom: fabricId },
    memory: { max: `${s.ramGb}G`, min: `${Math.max(1, Math.min(2, s.ramGb))}G` },
    // Entra direto no servidor
    server: { host: cfg.SERVER_HOST, port: cfg.SERVER_PORT },
    // Quando você tiver o servidor de auth (authlib-injector), descomente:
    // customArgs: [`-javaagent:${path.join(root, "authlib-injector.jar")}=${cfg.API_URL}`],
  };
  if (s.javaPath) opts.javaPath = s.javaPath;
  const extra = [...(PRESETS[s.jvmPreset] || []), ...s.jvmArgs.split(/\s+/).filter(Boolean)];
  if (extra.length) opts.customArgs = extra;
  if (s.fullscreen) opts.window = { fullscreen: true };
  else if (s.width && s.height) opts.window = { width: s.width, height: s.height };

  send("progress", { stage: "Iniciando o jogo", done: 0, total: 0 });
  const proc = await launcher.launch(opts);
  if (!proc) throw new Error("O Minecraft não conseguiu iniciar. Veja a aba Console.");
  send("progress", { stage: "Jogo iniciado", done: 1, total: 1 });
  send("started");
  return proc;
}

module.exports = { play, syncOnly, gameDir, detectJava };
