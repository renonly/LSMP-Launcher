// Conta do SMP: usuário + senha, validada pela SUA API (Cloudflare Worker).
// O launcher nunca guarda a senha, só o token que a API devolve.
const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const { API_URL } = require("./config");

const file = () => path.join(app.getPath("userData"), "session.bin");

async function call(route, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não deu pra conectar na API. Verifique sua internet.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro na autenticação.");
  return data; // { username, uuid, token }
}

function save(session) {
  const raw = JSON.stringify(session);
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(raw)
    : Buffer.from(raw);
  fs.writeFileSync(file(), buf);
}

function load() {
  try {
    const buf = fs.readFileSync(file());
    const raw = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function login(username, password) {
  const s = await call("/auth/login", { username, password });
  save(s);
  return s;
}

async function register(username, password) {
  const s = await call("/auth/register", { username, password });
  save(s);
  return s;
}

function logout() {
  try { fs.unlinkSync(file()); } catch {}
}

module.exports = { login, register, logout, load };
