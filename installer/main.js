const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const PRODUCT = "ESMP Launcher";
let win;

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  win = new BrowserWindow({
    width: 800, height: 480, resizable: false, maximizable: false, frame: false, show: false,
    backgroundColor: "#0a0614", title: "Instalar ESMP",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  win.once("ready-to-show", () => win.show());
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

const defaultDir = () => path.join(process.env.LOCALAPPDATA || app.getPath("appData"), "Programs", PRODUCT);
// o instalador do launcher (NSIS) vem embutido em resources/payload (ou installer/payload no npm start)
function payloadExe() {
  const dirs = [path.join(process.resourcesPath || "", "payload"), path.join(__dirname, "payload")];
  for (const d of dirs) {
    try { const f = fs.readdirSync(d).find((n) => /\.exe$/i.test(n)); if (f) return path.join(d, f); } catch {}
  }
  return null;
}

ipcMain.handle("defaultDir", () => defaultDir());
ipcMain.handle("chooseDir", async () => {
  const r = await dialog.showOpenDialog(win, { title: "Onde instalar o ESMP?", properties: ["openDirectory", "createDirectory"] });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0];
  // se escolheu uma pasta qualquer, instala numa subpasta própria (não bagunça a pasta escolhida)
  return path.basename(p).toLowerCase() === PRODUCT.toLowerCase() ? p : path.join(p, PRODUCT);
});

ipcMain.handle("install", (_e, dir) => new Promise((resolve) => {
  const exe = payloadExe();
  if (!exe) return resolve({ ok: false, error: "Arquivos do instalador não encontrados. Baixe o instalador de novo." });
  dir = String(dir || "").trim().replace(/[\\/]+$/, "");
  if (!/^[a-zA-Z]:\\/.test(dir) || /["&|^%<>]/.test(dir)) return resolve({ ok: false, error: "Pasta inválida. Use um caminho como C:\\Games\\ESMP (sem & % ^ | < >)." });
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); }
  catch { return resolve({ ok: false, error: "Sem permissão pra instalar nessa pasta. Escolha outra." }); }
  // NSIS silencioso: /S sem janela; /D= precisa ser o último argumento e SEM aspas
  exec(`"${exe}" /S /D=${dir}`, { windowsHide: true }, (err) => {
    if (err) return resolve({ ok: false, error: `A instalação falhou (código ${err.code ?? "?"}). Feche o launcher se estiver aberto e tente de novo.` });
    const main = path.join(dir, `${PRODUCT}.exe`);
    resolve(fs.existsSync(main) ? { ok: true } : { ok: false, error: "A instalação terminou, mas o programa não foi encontrado na pasta escolhida." });
  });
}));

ipcMain.handle("launch", async (_e, dir) => {
  const main = path.join(String(dir), `${PRODUCT}.exe`);
  if (fs.existsSync(main)) await shell.openPath(main);
  app.quit();
});
ipcMain.on("win", (_e, a) => {
  if (!win) return;
  if (a === "min") win.minimize();
  if (a === "close") app.quit();
});
