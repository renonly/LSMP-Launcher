const { contextBridge, ipcRenderer } = require("electron");
const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld("setup", {
  defaultDir: inv("defaultDir"),
  chooseDir: inv("chooseDir"),
  install: inv("install"),
  launch: inv("launch"),
  onProgress: (fn) => ipcRenderer.on("progress", (_e, v) => fn(v)),
  onPhase: (fn) => ipcRenderer.on("phase", (_e, v) => fn(v)),
  win: (a) => ipcRenderer.send("win", a),
});
