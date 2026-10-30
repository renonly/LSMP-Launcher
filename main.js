const { app, BrowserWindow, ipcMain, shell, clipboard } = require("electron");
const { autoUpdater } = require("electron-updater");
const os = require("os");
const path = require("path");
const fs = require("fs");
const auth = require("./src/auth");
const game = require("./src/game");
const updater = require("./src/updater");
const status = require("./src/status");
const settings = require("./src/settings");
const cfg = require("./src/config");

let win;
let running = false; // impede abrir o jogo duas vezes

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 620,
    minWidth: 820,
    minHeight: 540,
    frame: false,
    backgroundColor: "#1b2433",
    icon: fs.existsSync(path.join(__dirname, "build", "icon.png"))
      ? path.join(__dirname, "build", "icon.png")
      : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile("renderer/index.html");
  win.webContents.once("did-finish-load", checkForUpdates);
}

// Auto-update do próprio launcher (via GitHub Releases)
function checkForUpdates() {
  if (!app.isPackaged) return; // só funciona no app instalado
  const send = (state, extra = {}) =>
    win.webContents.send("update:status", { state, ...extra });

  autoUpdater.on("update-available", (i) => send("downloading", { version: i.version }));
  autoUpdater.on("update-downloaded", (i) => send("ready", { version: i.version }));
  autoUpdater.on("error", () => {}); // sem internet etc.: ignora em silêncio
  autoUpdater.checkForUpdates().catch(() => {});
}

const wrap = (fn) => async (_e, ...args) => {
  try { return { ok: true, data: await fn(...args) }; }
  catch (err) { return { ok: false, error: err.message }; }
};

const toRenderer = (ch, data) => {
  if (!win || win.isDestroyed()) return;
  win.webContents.send(`game:${ch}`, data);
};

// ---- conta ----
ipcMain.handle("auth:session", () => auth.load());
ipcMain.handle("auth:login", wrap(auth.login));
ipcMain.handle("auth:register", wrap(auth.register));
ipcMain.handle("auth:logout", () => auth.logout());

// ---- informações e preferências ----
ipcMain.handle("config", () => ({
  name: cfg.SERVER_NAME,
  mc: cfg.MC_VERSION,
  host: cfg.SERVER_HOST,
  port: cfg.SERVER_PORT,
  maxRam: Math.min(32, Math.max(2, Math.floor(os.totalmem() / 1024 ** 3))),
  version: app.getVersion(),
}));
ipcMain.handle("settings:get", () => settings.load());
ipcMain.handle("settings:set", (_e, patch) => settings.save(patch));
ipcMain.handle("status:server", () => status.ping(cfg.SERVER_HOST, cfg.SERVER_PORT));
ipcMain.handle("pack:info", wrap(() => updater.info(game.gameDir())));

// ---- jogo ----
ipcMain.handle("game:play", wrap(async () => {
  if (running) throw new Error("O jogo já está em execução.");
  const session = auth.load();
  if (!session) throw new Error("Faça login primeiro.");
  const s = settings.load();
  running = true;
  try {
    await game.play(session, s, (ch, data) => {
      toRenderer(ch, data);
      if (ch === "started" && s.minimizeOnLaunch) win.minimize();
      if (ch === "closed") {
        running = false;
        if (s.minimizeOnLaunch) { win.restore(); win.focus(); }
      }
    });
  } catch (err) {
    running = false;
    throw err;
  }
}));

// Atualiza o pack sem abrir o jogo (force = "Reparar arquivos")
ipcMain.handle("game:sync", wrap(async (force) => {
  if (running) throw new Error("Feche o jogo antes de verificar os arquivos.");
  running = true;
  try { await game.syncOnly(!!force, toRenderer); }
  finally { running = false; }
}));

ipcMain.handle("shell:openGame", () => shell.openPath(game.gameDir()));
ipcMain.on("clipboard:copy", (_e, text) => clipboard.writeText(String(text)));
ipcMain.on("update:install", () => autoUpdater.quitAndInstall(true, true));

ipcMain.on("win", (_e, action) => {
  if (action === "min") win.minimize();
  if (action === "max") win.isMaximized() ? win.unmaximize() : win.maximize();
  if (action === "close") win.close();
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
