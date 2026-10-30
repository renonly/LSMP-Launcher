const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  session: () => ipcRenderer.invoke("auth:session"),
  login: (u, p) => ipcRenderer.invoke("auth:login", u, p),
  register: (u, p) => ipcRenderer.invoke("auth:register", u, p),
  logout: () => ipcRenderer.invoke("auth:logout"),
  play: () => ipcRenderer.invoke("game:play"),
  sync: (force) => ipcRenderer.invoke("game:sync", force),
  on: (ch, fn) => ipcRenderer.on(`game:${ch}`, (_e, d) => fn(d)),
  onUpdate: (fn) => ipcRenderer.on("update:status", (_e, d) => fn(d)),
  installUpdate: () => ipcRenderer.send("update:install"),
  win: (action) => ipcRenderer.send("win", action),
  config: () => ipcRenderer.invoke("config"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  status: () => ipcRenderer.invoke("status:server"),
  packInfo: () => ipcRenderer.invoke("pack:info"),
  openGameDir: () => ipcRenderer.invoke("shell:openGame"),
  copy: (text) => ipcRenderer.send("clipboard:copy", text),
});
