// Tudo que você precisa mudar pro seu SMP fica aqui.
module.exports = {
  SERVER_NAME: "ESMP",
  GITHUB_REPO: "renonly/LSMP-Launcher", // dono/repositório (precisa ser PÚBLICO pro auto-update)
  API_URL: "https://lsmp-api.bsbr.workers.dev/", // seu Cloudflare Worker
  SERVER_HOST: "play.meusmp.com",            // IP/domínio do servidor
  SERVER_PORT: "25565",
  MC_VERSION: "1.21.1",
  FABRIC_LOADER: "0.16.5",
  NEOFORGE_LOADER: "21.1.265", // usado se o manifesto não informar a versão do NeoForge
  FORGE_LOADER: "52.1.0", // usado se o manifesto não informar a versão do Forge
  DEFAULT_RAM_GB: 4,
  // Pastas do pack que o launcher controla (o resto da instância não é mexido)
  MANAGED_DIRS: ["mods", "config", "resourcepacks", "shaderpacks"],
};
