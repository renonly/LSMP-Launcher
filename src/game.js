const { Client } = require("minecraft-launcher-core");
const fs = require("fs");
const path = require("path");
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
    const res = await fetch(url);
    if (!res.ok) throw new Error("Não consegui baixar o Fabric.");
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, await res.text());
  }
  return id;
}

async function play(session, ramGb, send) {
  const root = gameDir();
  fs.mkdirSync(root, { recursive: true });

  const manifest = await updater.sync(root, (p) => send("progress", p));
  // versão do Minecraft/Fabric vem do pack.json do repositório do modpack
  const mc = manifest.minecraft || cfg.MC_VERSION;
  const loader = manifest.loader?.version || cfg.FABRIC_LOADER;
  const fabricId = await ensureFabric(root, mc, loader);

  const launcher = new Client();
  launcher.on("progress", (e) =>
    send("progress", { stage: `Baixando ${e.type}`, done: e.task, total: e.total })
  );
  launcher.on("debug", (m) => console.log("[mc]", m));
  launcher.on("data", (m) => console.log("[mc]", m));
  launcher.on("close", (code) => send("closed", code));

  await launcher.launch({
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
    memory: { max: `${ramGb}G`, min: "1G" },
    // Entra direto no servidor
    server: { host: cfg.SERVER_HOST, port: cfg.SERVER_PORT },
    // Quando você tiver o servidor de auth (authlib-injector), descomente:
    // customArgs: [`-javaagent:${path.join(root, "authlib-injector.jar")}=${cfg.API_URL}`],
  });
  send("progress", { stage: "Jogo iniciado", done: 1, total: 1 });
}

module.exports = { play };
