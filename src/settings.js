// Preferências do jogador, salvas em userData/settings.json
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const cfg = require("./config");

const file = () => path.join(app.getPath("userData"), "settings.json");

const defaults = () => ({
  ramGb: cfg.DEFAULT_RAM_GB,
  javaPath: "",          // vazio = usa o "java" do sistema
  jvmArgs: "",           // argumentos extras da JVM
  fullscreen: false,
  width: 0,              // 0 = padrão do Minecraft
  height: 0,
  minimizeOnLaunch: true // minimiza o launcher quando o jogo abre
});

const int = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function sanitize(raw, base) {
  const s = { ...base, ...raw };
  return {
    ramGb: int(s.ramGb, 1, 64, base.ramGb),
    javaPath: String(s.javaPath || "").trim().slice(0, 500),
    jvmArgs: String(s.jvmArgs || "").trim().slice(0, 1000),
    fullscreen: !!s.fullscreen,
    width: int(s.width, 0, 10000, 0),
    height: int(s.height, 0, 10000, 0),
    minimizeOnLaunch: !!s.minimizeOnLaunch,
  };
}

function load() {
  try {
    return sanitize(JSON.parse(fs.readFileSync(file(), "utf8")), defaults());
  } catch {
    return defaults();
  }
}

function save(patch) {
  const next = sanitize(patch, load());
  fs.writeFileSync(file(), JSON.stringify(next, null, 2));
  return next;
}

module.exports = { load, save };
