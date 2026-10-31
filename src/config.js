module.exports = {
  SERVER_NAME: "ESMP",
  GITHUB_REPO: "renonly/ESMP-Launcher",
  API_URL: "https://lsmp-api.bsbr.workers.dev/",
  SERVER_HOST: "play.meusmp.com",     
  SERVER_PORT: "25565",
  MC_VERSION: "1.21.1",
  FABRIC_LOADER: "0.16.5",
  NEOFORGE_LOADER: "21.1.265", 
  FORGE_LOADER: "52.1.0", 
  DEFAULT_RAM_GB: 4,
  
  // Pastas "espelhadas": o launcher apaga o que nao estiver no pack.
  MANAGED_DIRS: ["mods", "resourcepacks", "shaderpacks"],
  // Pastas "preservadas": nunca apaga nada e nao sobrescreve o que voce editou
  // (so atualiza um arquivo se o servidor mudou aquele arquivo desde a ultima vez).
  PRESERVE_DIRS: ["config"],
};
