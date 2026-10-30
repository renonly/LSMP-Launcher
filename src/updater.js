// Sincroniza o pack local com o manifest da API (hash por arquivo).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { API_URL, MANAGED_DIRS } = require("./config");

const sha1 = (p) =>
  new Promise((resolve) => {
    const h = crypto.createHash("sha1");
    fs.createReadStream(p)
      .on("data", (d) => h.update(d))
      .on("end", () => resolve(h.digest("hex")))
      .on("error", () => resolve(null));
  });

async function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? out.push(...(await walk(p))) : out.push(p);
  }
  return out;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url} (${res.status})`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + ".part";
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
}

async function getManifest() {
  const res = await fetch(`${API_URL}/manifest`);
  if (!res.ok) throw new Error("Não consegui buscar o manifest do pack.");
  return res.json();
}

// onProgress({ stage, done, total, file })
async function sync(gameDir, onProgress = () => {}) {
  const manifest = await getManifest();
  const wanted = new Map(manifest.files.map((f) => [path.normalize(f.path), f]));

  // 1) baixa o que falta ou mudou
  const todo = [];
  for (const [rel, f] of wanted) {
    const abs = path.join(gameDir, rel);
    if (!fs.existsSync(abs) || (await sha1(abs)) !== f.sha1) todo.push(f);
  }
  let done = 0;
  for (const f of todo) {
    onProgress({ stage: "Atualizando pack", done, total: todo.length, file: f.path });
    // proteção contra path traversal vindo do manifest
    const abs = path.resolve(gameDir, f.path);
    if (!abs.startsWith(path.resolve(gameDir) + path.sep)) continue;
    await download(f.url, abs);
    done++;
  }

  // 2) apaga o que saiu do pack (só nas pastas gerenciadas)
  for (const dir of MANAGED_DIRS) {
    for (const abs of await walk(path.join(gameDir, dir))) {
      if (!wanted.has(path.relative(gameDir, abs))) fs.unlinkSync(abs);
    }
  }

  onProgress({ stage: "Pack atualizado", done: todo.length, total: todo.length });
  return manifest;
}

module.exports = { sync };
