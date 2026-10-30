const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const auth = require("./src/auth");
const game = require("./src/game");
const cfg = require("./src/config");

let win;

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

ipcMain.handle("auth:session", () => auth.load());
ipcMain.handle("auth:login", wrap(auth.login));
ipcMain.handle("auth:register", wrap(auth.register));
ipcMain.handle("auth:logout", () => auth.logout());
ipcMain.handle("config", () => ({
  name: cfg.SERVER_NAME, mc: cfg.MC_VERSION, ram: cfg.DEFAULT_RAM_GB,
}));
ipcMain.handle("game:play", wrap(async (ram) => {
  const session = auth.load();
  if (!session) throw new Error("Faça login primeiro.");
  await game.play(session, ram, (ch, data) => win.webContents.send(`game:${ch}`, data));
}));
ipcMain.on("update:install", () => autoUpdater.quitAndInstall(true, true));

ipcMain.on("win", (_e, action) => {
  if (action === "min") win.minimize();
  if (action === "max") win.isMaximized() ? win.unmaximize() : win.maximize();
  if (action === "close") win.close();
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
