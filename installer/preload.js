const { contextBridge, ipcRenderer } = require("electron");
const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld("setup", {
  defaultDir: inv("defaultDir"),
  chooseDir: inv("chooseDir"),
  install: inv("install"),
  launch: inv("launch"),
  win: (a) => ipcRenderer.send("win", a),
});
