// O minecraft-launcher-core ignora "arguments.jvm" do perfil do NeoForge/Forge moderno
// (module path, --add-opens, -DlibraryDirectory...). Sem isso o jogo fecha com código 1.
// Aqui lemos esses argumentos do perfil instalado e trocamos as variáveis.
const fs = require("fs");
const path = require("path");

function ruleAllows(rules) {
  if (!Array.isArray(rules)) return true;
  let ok = false;
  for (const r of rules) {
    let match = true;
    if (r.os) {
      if (r.os.name && r.os.name !== "windows") match = false;
    }
    if (r.features) match = false;
    if (match) ok = r.action === "allow";
  }
  return ok;
}

function neoJvmArgs(root, id, log = () => {}) {
  const file = path.join(root, "versions", id, `${id}.json`);
  let json;
  try { json = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { log(`[ESMP] não consegui ler ${file}: ${e.message}`); return []; }
  const vars = {
    library_directory: path.join(root, "libraries"),
    classpath_separator: path.delimiter,
    version_name: id,
  };
  const out = [];
  for (const a of json.arguments?.jvm || []) {
    let vals = [];
    if (typeof a === "string") vals = [a];
    else if (ruleAllows(a.rules)) vals = Array.isArray(a.value) ? a.value : [a.value];
    for (let v of vals) {
      v = String(v).replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
      if (/\$\{/.test(v)) continue; // variável que o launcher já trata (classpath, natives...)
      out.push(v);
    }
  }
  // MCLC já adiciona -cp e -Djava.library.path; remove duplicatas desses
  const clean = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] === "-cp" || out[i] === "-classpath") { i++; continue; }
    if (out[i].startsWith("-Djava.library.path=")) continue;
    clean.push(out[i]);
  }
  log(`[ESMP] ${clean.length} argumentos de JVM do NeoForge aplicados`);
  return clean;
}

// Mostra o final do log do jogo no Console quando ele fecha com erro
function tailLogs(root, log) {
  const now = Date.now();
  const show = (file, n) => {
    try {
      if (now - fs.statSync(file).mtimeMs > 10 * 60 * 1000) return false;
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).slice(-n);
      log(`----- ${path.basename(file)} (últimas ${lines.length} linhas) -----`);
      lines.forEach((l) => log(l));
      return true;
    } catch { return false; }
  };
  let any = show(path.join(root, "logs", "latest.log"), 40);
  try {
    const dir = path.join(root, "crash-reports");
    const f = fs.readdirSync(dir).map((n) => path.join(dir, n)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (f && show(f, 25)) any = true;
  } catch {}
  try {
    for (const n of fs.readdirSync(root).filter((n) => /^hs_err_pid.*\.log$/.test(n))) any = show(path.join(root, n), 15) || any;
  } catch {}
  if (!any) log("[ESMP] O jogo fechou sem escrever nenhum log. Provável erro de Java/argumentos.");
}

module.exports = { neoJvmArgs, tailLogs };
