const $ = (id) => document.getElementById(id);
const api = window.setup;
let page = 0, dir = "", timer = null;

function show(n) {
  page = n;
  document.querySelectorAll(".page").forEach((p) => (p.hidden = +p.dataset.page !== n));
  const step = Math.min(n, 3);
  document.querySelectorAll("#steps li").forEach((li) => {
    const s = +li.dataset.s; li.classList.toggle("on", s === step); li.classList.toggle("done", s < step);
  });
}
document.addEventListener("click", (e) => { const w = e.target.closest("[data-win]"); if (w) api.win(w.dataset.win); });

$("go-1").onclick = () => show(1);
$("back-0").onclick = () => show(0);
$("back-1").onclick = () => show(1);
$("browse").onclick = async () => { const p = await api.chooseDir(); if (p) $("dir").value = p; };

const STAGES = [[0, "Preparando"], [12, "Copiando arquivos"], [55, "Criando atalhos"], [80, "Registrando o programa"], [92, "Finalizando"]];
function setPct(v) {
  v = Math.min(100, Math.round(v));
  $("fill").style.width = v + "%"; $("pct").textContent = v + "%";
  $("stage").textContent = v >= 100 ? "Concluído" : [...STAGES].reverse().find(([t]) => v >= t)[1];
}
async function run() {
  dir = $("dir").value.trim(); $("dir-error").textContent = "";
  if (!dir) return ($("dir-error").textContent = "Escolha uma pasta.");
  show(2); setPct(0);
  // o instalador por baixo não informa progresso: avança suave até ~92% e completa quando terminar
  let v = 0; clearInterval(timer);
  timer = setInterval(() => { v += (92 - v) * 0.035; setPct(v); }, 300);
  const r = await api.install(dir);
  clearInterval(timer);
  if (!r.ok) { $("fail").textContent = r.error; return show(4); }
  setPct(100);
  setTimeout(() => show(3), 700);
}
$("do-install").onclick = run;
$("retry").onclick = run;
$("finish").onclick = () => ($("run").checked ? api.launch(dir) : api.win("close"));

(async () => { $("dir").value = await api.defaultDir(); setTimeout(() => document.documentElement.classList.remove("booting"), 50); })();
