// Sincroniza o pack local com o manifest da API (hash por arquivo).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { API_URL: RAW_API_URL, MANAGED_DIRS } = require("./config");
const API_URL = RAW_API_URL.replace(/\/+$/, "");

const PARALLEL = 4;
const cachePath = (gameDir) => path.join(gameDir, "manifest.cache.json");

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

async function download(url, dest, expectedSha1) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Falha ao baixar ${path.basename(dest)} (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (expectedSha1 && crypto.createHash("sha1").update(buf).digest("hex") !== expectedSha1)
    throw new Error(`Arquivo corrompido no download: ${path.basename(dest)}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + ".part";
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, dest);
}

// Busca o manifest; se a API estiver fora do ar, usa a cópia salva da última vez.
async function loadManifest(gameDir) {
  let failure;
  try {
    const res = await fetch(`${API_URL}/manifest`, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (res.ok) {
      const manifest = await res.json();
      fs.mkdirSync(gameDir, { recursive: true });
      fs.writeFileSync(cachePath(gameDir), JSON.stringify(manifest));
      return { manifest, offline: false };
    }
    failure =
      res.status === 404
        ? "O pack ainda não foi publicado no servidor. Avise o dono do SMP."
        : `A API respondeu HTTP ${res.status} ao buscar o pack.`;
  } catch {
    failure = "Não consegui falar com a API do pack. Verifique sua internet.";
  }
  try {
    return { manifest: JSON.parse(fs.readFileSync(cachePath(gameDir), "utf8")), offline: true };
  } catch {
    throw new Error(failure);
  }
}

// Resumo do pack pra tela "Pack" (inclui se cada arquivo já está instalado)
async function info(gameDir) {
  const { manifest, offline } = await loadManifest(gameDir);
  return {
    version: manifest.version,
    minecraft: manifest.minecraft,
    loader: manifest.loader,
    offline,
    files: manifest.files.map((f) => ({
      path: f.path,
      size: f.size || 0,
      installed: fs.existsSync(path.join(gameDir, f.path)),
    })),
  };
}

// onProgress({ stage, done, total, file })
// force = baixa tudo de novo (usado em "Reparar arquivos")
async function sync(gameDir, onProgress = () => {}, { force = false } = {}) {
  onProgress({ stage: "Verificando o pack", done: 0, total: 0 });
  const { manifest, offline } = await loadManifest(gameDir);

  if (offline) {
    onProgress({ stage: "Sem conexão com a API, usando o pack já instalado", done: 1, total: 1 });
    return manifest;
  }

  const wanted = new Map(manifest.files.map((f) => [path.normalize(f.path), f]));
  const root = path.resolve(gameDir);

  // 1) descobre o que falta ou mudou
  const todo = [];
  for (const [rel, f] of wanted) {
    const abs = path.resolve(gameDir, rel);
    if (!abs.startsWith(root + path.sep)) continue; // proteção contra path traversal
    if (force || !fs.existsSync(abs) || (await sha1(abs)) !== f.sha1) todo.push({ f, abs });
  }

  // 2) baixa, 4 por vez
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const { f, abs } = todo[next++];
      onProgress({ stage: "Atualizando pack", done, total: todo.length, file: f.path });
      await download(f.url, abs, f.sha1);
      done++;
      onProgress({ stage: "Atualizando pack", done, total: todo.length, file: f.path });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));

  // 3) apaga o que saiu do pack (só nas pastas gerenciadas)
  for (const dir of MANAGED_DIRS) {
    for (const abs of await walk(path.join(gameDir, dir))) {
      if (!wanted.has(path.relative(gameDir, abs))) fs.unlinkSync(abs);
    }
  }

  onProgress({ stage: "Pack atualizado", done: todo.length, total: todo.length });
  return manifest;
}

module.exports = { sync, info };
