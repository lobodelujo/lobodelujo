// Lógica del catálogo. No necesitas editar este archivo: los productos se editan desde el panel /admin
// (los datos los carga cargar.js antes de este archivo)

const $ = (sel, el = document) => el.querySelector(sel);
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const buscarProducto = (id) => PRODUCTOS.find((p) => p.id === id);
// Acepta un número ("569...") o una lista [{ nombre, numero }]
const NUMEROS = Array.isArray(TIENDA.whatsapp)
  ? TIENDA.whatsapp.filter((n) => n && n.numero)
  : [{ nombre: "WhatsApp", numero: TIENDA.whatsapp }];
const linkWa = (texto, numero = NUMEROS[0] ? NUMEROS[0].numero : "") =>
  `https://wa.me/${String(numero).replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
// Link de cada prenda: en WhatsApp o Instagram se ve con su foto, nombre y precio (lo arma functions/p/[id].js)
const linkProducto = (p) => `${location.origin}/p/${encodeURIComponent(p.id)}`;

// Con un número abre WhatsApp directo; con varios, el cliente elige a quién escribir
let textoPendiente = "";
function enviarWa(texto) {
  if (NUMEROS.length < 2) { window.open(linkWa(texto), "_blank"); return; }
  textoPendiente = texto;
  $("#wa-opciones").innerHTML = NUMEROS
    .map((n, i) => `<button class="btn btn-wa" data-num="${i}">${esc(n.nombre)}</button>`)
    .join("");
  $("#elegir-wa").hidden = false;
}

// Cuando una foto todavía no existe en img/, se muestra el logo como recuadro de ejemplo
function ph(img) {
  img.onerror = null;
  img.classList.add("sin-foto");
  img.src = "img/logo-lobo-128.png";
}
const imgTag = (src, ph, extra = "", ancho = 600) =>
  `<img src="${esc(foto(src, ancho))}" data-ph="${esc(ph)}" onerror="ph(this)" alt="${esc(ph)}" ${extra}>`;

// ---------- Estado ----------
let filtro = "Todo";
let filtroTalla = null;
let texto = "";
let bolsa = [];
try { bolsa = JSON.parse(localStorage.getItem("lobo-bolsa")) || []; } catch { bolsa = []; }
bolsa = bolsa.filter((i) => buscarProducto(i.id));
const guardarBolsa = () => { try { localStorage.setItem("lobo-bolsa", JSON.stringify(bolsa)); } catch {} };

// ---------- Textos de la tienda ----------
$("#aviso-envio").textContent = TIENDA.envio;
$("#pie-envio").textContent = TIENDA.envio;
$("#hero-frase").textContent = TIENDA.frase;
$("#hero-abajo").textContent = TIENDA.fraseAbajo || "";
$("#hero-abajo").hidden = !TIENDA.fraseAbajo;
$("#link-ig").href = TIENDA.instagram;
$("#link-wa").dataset.wa = `Hola ${TIENDA.nombre} 🐺`;
$("#wa-flotante").dataset.wa = `Hola ${TIENDA.nombre} 🐺 Vengo de la web y tengo una consulta.`;
$("#anio").textContent = new Date().getFullYear();

// ---------- Sonidos ----------
// Los navegadores no dejan sonar nada hasta que la persona toca la página una vez:
// con ese primer toque queda lista la tarjeta de sonido para el toque en fotos y la moto.
let ctxAudio = null, toque = null;
const audio = () => {
  if (!ctxAudio) {
    ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
    // Si la moto ya estaba andando cuando la persona tocó la pantalla, el motor encendido parte ahí
    ctxAudio.addEventListener("statechange", retomarRalenti);
  }
  if (ctxAudio.state === "suspended") ctxAudio.resume();
  return ctxAudio;
};
for (const t of ["pointerup", "touchend", "keydown"]) addEventListener(t, () => { try { audio(); retomarRalenti(); } catch {} }, { capture: true, once: true });
// Solo para sonidos que no vienen de un toque (la moto): si todavía no se puede, no suena
const audioListo = () => (ctxAudio && ctxAudio.state === "running" ? ctxAudio : null);
// Ruido blanco corto (escape del motor, cartón)
const ruido = (ctx, seg) => {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seg), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = b;
  return s;
};

// Motor de la moto: sonidos/motor.wav (acelerada grabada de CapCut). Al frenar baja de tono y de volumen,
// como al soltar el acelerador. Si el archivo no carga, se genera uno parecido. (dur en segundos)
let motorGrabado = null;
fetch("sonidos/motor.wav")
  .then((r) => r.arrayBuffer())
  .then((b) => new OfflineAudioContext(1, 1, 22050).decodeAudioData(b))
  .then((b) => { motorGrabado = b; })
  .catch(() => {});
function sonidoMotor(dur) {
  const ctx = audioListo();
  if (!ctx) return;
  try {
    const t = ctx.currentTime, punta = t + dur * 0.6, fin = t + dur + 0.18;
    if (motorGrabado) {
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = motorGrabado;
      s.playbackRate.setValueAtTime(1, punta);
      s.playbackRate.linearRampToValueAtTime(0.8, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.42, t + 0.04);
      g.gain.setValueAtTime(0.42, punta);
      g.gain.exponentialRampToValueAtTime(0.13, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, fin);
      s.connect(g).connect(ctx.destination);
      s.start(t);
      s.stop(fin);
      return;
    }
    const salida = ctx.createGain();
    salida.gain.setValueAtTime(0.0001, t);
    salida.gain.exponentialRampToValueAtTime(0.36, t + 0.07);
    salida.gain.setValueAtTime(0.36, punta);
    salida.gain.exponentialRampToValueAtTime(0.12, t + dur);
    salida.gain.exponentialRampToValueAtTime(0.0001, fin);
    salida.connect(ctx.destination);
    // Traqueteo del motor de 2 tiempos: el volumen late al ritmo de las explosiones
    const latido = ctx.createGain(), lfo = ctx.createOscillator(), prof = ctx.createGain();
    latido.gain.value = 0.65;
    prof.gain.value = 0.35;
    lfo.type = "square";
    lfo.frequency.setValueAtTime(26, t);
    lfo.frequency.exponentialRampToValueAtTime(58, punta);
    lfo.frequency.exponentialRampToValueAtTime(32, t + dur);
    lfo.connect(prof).connect(latido.gain);
    latido.connect(salida);
    // Tono del motor (zumbido + cuerpo una octava abajo), suavizado como si saliera por el escape
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 2;
    filtro.frequency.setValueAtTime(650, t);
    filtro.frequency.linearRampToValueAtTime(1900, punta);
    filtro.frequency.linearRampToValueAtTime(750, t + dur);
    filtro.connect(latido);
    const fuentes = [lfo];
    for (const [tipo, mult, vol] of [["sawtooth", 1, 0.55], ["square", 0.5, 0.3]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(52 * mult, t);
      o.frequency.exponentialRampToValueAtTime(116 * mult, punta);
      o.frequency.exponentialRampToValueAtTime(64 * mult, t + dur);
      g.gain.value = vol;
      o.connect(g).connect(filtro);
      fuentes.push(o);
    }
    // Soplido del escape
    const escape = ruido(ctx, dur + 0.2), fe = ctx.createBiquadFilter(), ge = ctx.createGain();
    fe.type = "bandpass";
    fe.frequency.value = 1200;
    fe.Q.value = 0.7;
    ge.gain.value = 0.12;
    escape.connect(fe).connect(ge).connect(latido);
    fuentes.push(escape);
    for (const f of fuentes) { f.start(t); f.stop(fin); }
  } catch {}
}

// Motor encendido (ralentí): sonidos/motor-encendido.wav, grabado de una moto de verdad y repetido en bucle
// sin corte. Suena todo el rato que la moto está en "¿Cómo comprar?": parada en cada paso mientras se lee la
// tarjeta, andando (más bajito, debajo de la acelerada) y después de dejar el paquete. Se apaga al salir de
// la sección, al abrir el carrito o una prenda, o al cambiar de pestaña.
const VOL_RALENTI = 0.18; // un poco más bajo que la acelerada (el ralentí suena parejo y lleno, se oye igual)
let ralentiGrabado = null, ralenti = null, ralentiQuiere = false;
fetch("sonidos/motor-encendido.wav")
  .then((r) => r.arrayBuffer())
  .then((b) => new OfflineAudioContext(1, 1, 22050).decodeAudioData(b))
  .then((b) => { ralentiGrabado = b; retomarRalenti(); })
  .catch(() => {});
const ralentiCallado = () => document.hidden || document.body.classList.contains("bloqueado");
function retomarRalenti() {
  const ctx = audioListo();
  if (!ctx || !ralentiQuiere || !ralentiGrabado) return;
  try {
    const t = ctx.currentTime, vol = ralentiCallado() ? 0.0001 : VOL_RALENTI;
    if (ralenti) {
      ralenti.vol.gain.cancelScheduledValues(t);
      ralenti.vol.gain.setTargetAtTime(vol, t, 0.15);
      return;
    }
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = ralentiGrabado;
    s.loop = true;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(vol, t, 0.15);
    s.connect(g).connect(ctx.destination);
    // Parte en un punto al azar del bucle, para que no suene idéntico cada vez
    s.start(t, Math.random() * ralentiGrabado.duration);
    ralenti = { s, vol: g };
  } catch {}
}
function encenderMotor() {
  ralentiQuiere = true;
  retomarRalenti();
}
function apagarMotor() {
  ralentiQuiere = false;
  const r = ralenti;
  if (!r) return;
  ralenti = null;
  try {
    const t = r.s.context.currentTime;
    r.vol.gain.cancelScheduledValues(t);
    r.vol.gain.setTargetAtTime(0.0001, t, 0.18);
    r.s.stop(t + 1);
  } catch {}
}
// Mientras anda, el ralentí queda debajo de la acelerada y sube un poco de tono, como al dar gas
function ralentiAndando(dur) {
  const ctx = audioListo();
  if (!ctx || !ralenti || ralentiCallado()) return;
  try {
    const t = ctx.currentTime, g = ralenti.vol.gain, r = ralenti.s.playbackRate;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(VOL_RALENTI * 0.35, t, 0.06);
    g.setTargetAtTime(VOL_RALENTI, t + dur * 0.85, 0.12);
    r.cancelScheduledValues(t);
    r.setValueAtTime(r.value, t);
    r.linearRampToValueAtTime(1.18, t + dur * 0.6);
    r.linearRampToValueAtTime(1, t + dur);
  } catch {}
}
// Con el carrito o una prenda abiertos, o en otra pestaña, el motor se calla; al volver, sigue
const ajustarRalenti = () => { if (ralenti) retomarRalenti(); };
document.addEventListener("visibilitychange", ajustarRalenti);
new MutationObserver(ajustarRalenti).observe(document.body, { attributes: true, attributeFilter: ["class"] });

// Chirrido corto y suave de freno
function sonidoFreno() {
  const ctx = audioListo();
  if (!ctx) return;
  try {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(2150, t);
    o.frequency.linearRampToValueAtTime(1750, t + 0.2);
    vib.frequency.value = 30;
    vg.gain.value = 45;
    vib.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.065, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(ctx.destination);
    for (const f of [o, vib]) { f.start(t); f.stop(t + 0.25); }
  } catch {}
}

// Caja de cartón que cae al suelo: golpe sordo + roce del cartón (suave = rebote)
function sonidoPaquete(suave = 1) {
  const ctx = audioListo();
  if (!ctx) return;
  try {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * suave, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.25);
    const carton = ruido(ctx, 0.08), f = ctx.createBiquadFilter(), gc = ctx.createGain();
    f.type = "bandpass";
    f.frequency.value = 900;
    f.Q.value = 0.8;
    gc.gain.setValueAtTime(0.35 * suave, t);
    gc.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    carton.connect(f).connect(gc).connect(ctx.destination);
    carton.start(t);
  } catch {}
}

// Toque en fotos: sonidos/toque.wav (si no carga, se genera uno parecido)
fetch("sonidos/toque.wav")
  .then((r) => r.arrayBuffer())
  .then((b) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(b))
  .then((b) => { toque = b; })
  .catch(() => {});
function sonidoToque() {
  try {
    audio();
    const t = ctxAudio.currentTime, vol = ctxAudio.createGain();
    if (toque) {
      const s = ctxAudio.createBufferSource();
      s.buffer = toque;
      vol.gain.value = 0.6;
      s.connect(vol).connect(ctxAudio.destination);
      s.start(t);
      return;
    }
    const osc = ctxAudio.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.09);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(vol).connect(ctxAudio.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch {}
}

// Perchero: gancho metálico que tintinea contra el riel (2 golpecitos, cada vez con tono un poco distinto)
function sonidoGancho(fuerza = 1) {
  const ctx = audioListo();
  if (!ctx) return;
  try {
    const salida = ctx.createGain(), base = 2500 * (0.93 + Math.random() * 0.14);
    salida.gain.value = fuerza;
    salida.connect(ctx.destination);
    for (const [espera, vol] of [[0, 1], [0.06, 0.4]]) {
      const t = ctx.currentTime + espera;
      for (const [mult, pico, dur] of [[1, 0.16, 0.2], [2.71, 0.09, 0.11], [5.12, 0.05, 0.05]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = base * mult * (espera ? 1.06 : 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(pico * vol, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(salida);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
      const clic = ruido(ctx, 0.012), f = ctx.createBiquadFilter(), gc = ctx.createGain();
      f.type = "highpass";
      f.frequency.value = 3500;
      gc.gain.value = 0.14 * vol;
      clic.connect(f).connect(gc).connect(salida);
      clic.start(t);
    }
  } catch {}
}

// Vitrina: "tic" suave cada vez que un accesorio pasa adelante al girarla con el dedo (como la perilla de un reloj)
function sonidoTic(fuerza = 1) {
  const ctx = audioListo();
  if (!ctx) return;
  try {
    const t = ctx.currentTime, s = ruido(ctx, 0.03), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "bandpass";
    f.frequency.value = 3200 * (0.95 + Math.random() * 0.1);
    f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * fuerza, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t);
    s.stop(t + 0.04);
    const o = ctx.createOscillator(), go = ctx.createGain();
    o.frequency.value = 1900;
    go.gain.setValueAtTime(0.0001, t);
    go.gain.exponentialRampToValueAtTime(0.03 * fuerza, t + 0.003);
    go.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(go).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.07);
  } catch {}
}

// Vitrina: soplido de aire al acercar un accesorio (sube) o al devolverlo a la vitrina (baja)
function sonidoAire(fuerza = 1, sube = true) {
  try {
    const ctx = audio(), t = ctx.currentTime, s = ruido(ctx, 0.6), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "bandpass";
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(sube ? 380 : 1700, t);
    f.frequency.exponentialRampToValueAtTime(sube ? 1900 : 420, t + 0.42);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38 * fuerza, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t);
    s.stop(t + 0.6);
  } catch {}
}

// Perchero: roce de la tela al sacar la prenda del riel (suena con el toque, por eso usa audio())
function sonidoTela(fuerza = 1) {
  try {
    const ctx = audio(), t = ctx.currentTime, s = ruido(ctx, 0.5), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "bandpass";
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7 * fuerza, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t);
    s.stop(t + 0.5);
  } catch {}
}

// Video de portada a pantalla completa: solo aparece si hay video cargado en el panel
// (en el celular usa el video vertical si existe)
const videoSrc = matchMedia("(max-width: 700px)").matches
  ? TIENDA.videoPortadaMovil || TIENDA.videoPortada
  : TIENDA.videoPortada || TIENDA.videoPortadaMovil;
if (videoSrc) {
  const v = $("#video");
  if (TIENDA.videoPoster) v.poster = foto(TIENDA.videoPoster, 1600);
  v.addEventListener("error", () => { if (!TIENDA.videoPoster) $("#video-portada").hidden = true; });
  v.src = videoSrc;
  $("#video-portada").hidden = false;

  // Siempre con sonido, a volumen bajo, y el sonido se va apagando al bajar y dejar atrás el video.
  // Los navegadores no dejan partir con sonido a quien recién entra: parte en silencio
  // y el sonido se enciende con el primer toque en cualquier parte de la pantalla.
  const VOLUMEN = 0.35;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  v.volume = 0.5;
  const volumenFijo = v.volume !== 0.5; // en iPhone el volumen lo maneja el teléfono: ahí solo se apaga al bajar
  let visible = 0, conSonido = false;
  function ajustarSonido() {
    if (!conSonido) return;
    // Con la ficha de un producto o el carrito abiertos, el video no suena
    const x = document.body.classList.contains("bloqueado") ? 0 : VOLUMEN * Math.min(1, Math.max(0, (visible - 0.3) / 0.5));
    if (volumenFijo) v.muted = x === 0;
    else { v.muted = false; v.volume = x; }
  }
  const TOQUES = ["pointerup", "touchend", "keydown"];
  function activarSonido() {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    for (const t of TOQUES) removeEventListener(t, activarSonido, true);
    conSonido = true;
    $("#video-tocar").hidden = true;
    // Encender el sonido dentro del toque deja el video desbloqueado para después (lo exige el iPhone)
    v.muted = false;
    v.play().then(() => { if (visible < 0.2 || quieto) v.pause(); }).catch(() => {});
    ajustarSonido();
  }
  for (const t of TOQUES) addEventListener(t, activarSonido, true);
  $("#video-tocar").hidden = false;

  // Solo se reproduce mientras se ve en pantalla (ahorra batería y datos)
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting ? e.intersectionRatio : 0;
    if (visible >= 0.2 && !quieto) v.play().catch(() => {});
    else v.pause();
    ajustarSonido();
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(v);
  new MutationObserver(ajustarSonido).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) v.pause();
    else if (visible >= 0.2 && !quieto) v.play().catch(() => {});
  });
}

// Cualquier elemento con data-wa="mensaje" abre WhatsApp con ese mensaje
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-wa]");
  if (!el) return;
  e.preventDefault();
  enviarWa(el.dataset.wa);
});
$("#elegir-wa").addEventListener("click", (e) => {
  const b = e.target.closest("[data-num]");
  if (b) window.open(linkWa(textoPendiente, NUMEROS[Number(b.dataset.num)].numero), "_blank");
  if (b || e.target.closest("[data-cerrar-wa]")) $("#elegir-wa").hidden = true;
});

// ---------- Filtros y grilla ----------
const categorias = () => [...new Set([...(TIENDA.categorias || []), ...PRODUCTOS.map((p) => p.categoria)])];

function pintarFiltros() {
  const cats = ["Todo", ...categorias()];
  const fila = $("#filtros");
  fila.innerHTML = cats
    .map((c) => `<button class="chip" role="tab" aria-selected="${c === filtro}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join("");
  // La categoría elegida queda al centro de la fila (en el celular la fila se desliza)
  const activa = $('[aria-selected="true"]', fila);
  if (activa) fila.scrollTo({ left: activa.offsetLeft - (fila.clientWidth - activa.offsetWidth) / 2, behavior: "smooth" });
}

// Subfiltro de tallas: muestra las tallas que existen en la categoría elegida
function pintarTallas() {
  const enCategoria = PRODUCTOS.filter((p) => filtro === "Todo" || p.categoria === filtro);
  const tallas = [...new Set(enCategoria.flatMap((p) => p.tallas || []))]
    .filter((t) => t.toLowerCase() !== "única")
    .sort(ordenarTallas);
  const caja = $("#filtro-tallas");
  // En "Todo" se mezclan sistemas de tallas, así que el subfiltro aparece al elegir una categoría
  caja.hidden = filtro === "Todo" || tallas.length < 2;
  if (caja.hidden) return;
  caja.innerHTML =
    `<span class="etiqueta-talla">Talla</span>` +
    `<button class="chip" data-talla="" aria-pressed="${!filtroTalla}">Todas</button>` +
    tallas.map((t) => `<button class="chip" data-talla="${esc(t)}" aria-pressed="${t === filtroTalla}">${esc(t)}</button>`).join("");
}

function badge(p) {
  if (!p.disponible) return `<span class="badge gris">Agotado</span>`;
  if (!p.etiqueta) return "";
  const clase = p.etiqueta === "Oferta" ? "rojo" : "";
  return `<span class="badge ${clase}">${esc(p.etiqueta)}</span>`;
}
const precioHtml = (p) => `${fmt(p.precio)}${p.precioAntes ? `<s>${fmt(p.precioAntes)}</s>` : ""}`;

// Inicio: por cada categoría, 1 foto grande + 2 productos chicos (estilo McQueen)
function tarjetaChica(p) {
  const f = p.fotos || [];
  return `<a class="ed-prod ${p.disponible ? "" : "agotado"}" href="#producto=${esc(p.id)}">
    <span class="card-media">
      ${imgTag(f[0], p.nombre + " · 1", 'class="a" loading="lazy"')}
      ${f[1] ? imgTag(f[1], p.nombre + " · 2", 'class="b" loading="lazy"') : ""}
      ${badge(p)}
    </span>
    <span class="ed-prod-info">
      <span class="ed-prod-nombre">${esc(p.nombre)}</span>
      <span class="precio">${precioHtml(p)}</span>
    </span>
  </a>`;
}

// Recién llegados: primero los que tienen etiqueta "Nuevo" y se completa con los últimos agregados
// (los primeros del panel), para que la fila de 3 siempre se llene y se pueda deslizar
function recienLlegados() {
  const disponibles = PRODUCTOS.filter((p) => p.disponible);
  const nuevos = disponibles.filter((p) => p.etiqueta === "Nuevo");
  return [...nuevos, ...disponibles.filter((p) => p.etiqueta !== "Nuevo")].slice(0, 12);
}

function pintarEditorial() {
  let n = 0;
  const nuevos = recienLlegados();
  // El Perchero de Lobo va justo después de la primera categoría que se cuelga (Poleras)
  const anclaPerchero = categorias().find((c) => PERCHERO.includes(c) && PRODUCTOS.some((p) => p.categoria === c));
  // La vitrina que gira va en el lugar de Accesorios (si esa categoría no está en la lista, al final)
  const conVitrina = vitrinaProductos().length > 0;
  const vitrinaAlFinal = conVitrina && !categorias().includes(VITRINA_CATEGORIA);
  $("#editorial").innerHTML = categorias()
    .map((cat) => {
      if (cat === VITRINA_CATEGORIA) return conVitrina ? vitrinaHtml() : "";
      const prods = PRODUCTOS.filter((p) => p.categoria === cat);
      if (!prods.length) return "";
      const perchero = cat === anclaPerchero ? percheroHtml() : "";
      // La foto grande se sube en el panel; si no hay, se usa la del primer producto (y ese no se repite abajo)
      const portada = (TIENDA.portadasCategorias || []).find((c) => c && c.categoria === cat && c.foto);
      const grande = portada ? portada.foto : (prods[0].fotos || [])[0];
      const chicas = (portada ? prods : prods.slice(1)).slice(0, 2);
      const carga = n++ === 0 ? "" : 'loading="lazy"';
      return `<section class="ed-bloque">
        <a class="ed-grande" href="#catalogo" data-ver-cat="${esc(cat)}">
          <picture>
            ${portada && portada.fotoMovil ? `<source media="(max-width: 700px)" srcset="${esc(foto(portada.fotoMovil, 1080))}">` : ""}
            ${imgTag(grande, cat, carga, 1920)}
          </picture>
          <div class="ed-grande-texto"><h2>${esc(cat)}</h2><span class="ed-btn">Ver todo</span></div>
        </a>
        ${chicas.length ? `<div class="ed-chicas">${chicas.map(tarjetaChica).join("")}</div>` : ""}
      </section>${perchero}`;
    })
    .join("") + (vitrinaAlFinal ? vitrinaHtml() : "") + (nuevos.length ? `
    <section class="ed-bloque">
      <div class="ed-cab"><h2>Recién llegados</h2></div>
      <div class="carrusel" id="carrusel">
        <div class="carrusel-pista" id="carrusel-pista">${nuevos.map(tarjetaChica).join("")}</div>
        <button class="flecha izq" data-mover="-1" aria-label="Anteriores">‹</button>
        <button class="flecha der" data-mover="1" aria-label="Siguientes">›</button>
        <div class="carrusel-barra" aria-hidden="true"><span></span></div>
      </div>
    </section>` : "");
  prepararCarrusel();
  prepararPerchero();
  prepararVitrina();
  animarTitulos($("#editorial"));
}

// La barrita amarilla muestra cuánto falta por deslizar; las flechas aparecen solo con mouse.
// La foto del medio se ve grande y las de los lados más chicas y giradas, como un carrusel 3D.
function prepararCarrusel() {
  const caja = $("#carrusel");
  if (!caja) return;
  const pista = $("#carrusel-pista");
  const barra = $(".carrusel-barra span", caja);
  const tarjetas = [...pista.children];
  let paso = 0, empezo = false, pendiente = false;
  const marcar = () => {
    pendiente = false;
    if (!pista.clientWidth) return;
    caja.classList.toggle("quieto", pista.scrollWidth <= pista.clientWidth + 1);
    barra.style.width = (pista.clientWidth / pista.scrollWidth) * 100 + "%";
    barra.style.left = (pista.scrollLeft / pista.scrollWidth) * 100 + "%";
    const medio = pista.scrollLeft + pista.clientWidth / 2;
    let centro = null, menor = Infinity;
    for (const t of tarjetas) {
      const d = Math.max(-1, Math.min(1, (t.offsetLeft + t.offsetWidth / 2 - medio) / paso));
      t.style.setProperty("--d", d.toFixed(3));
      t.style.setProperty("--a", Math.abs(d).toFixed(3));
      if (Math.abs(d) < menor) { menor = Math.abs(d); centro = t; }
    }
    for (const t of tarjetas) t.classList.toggle("centro", t === centro);
  };
  const medir = () => {
    if (!pista.clientWidth) return;
    paso = tarjetas[0].offsetWidth + parseFloat(getComputedStyle(pista).columnGap || 0);
    // De entrada se ven 3 fotos con la segunda al medio
    if (!empezo && tarjetas.length > 1) { pista.scrollLeft = paso; empezo = true; }
    marcar();
  };
  pista.addEventListener("scroll", () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(marcar); }
  }, { passive: true });
  new ResizeObserver(medir).observe(pista);
  caja.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mover]");
    if (b) pista.scrollBy({ left: Number(b.dataset.mover) * paso, behavior: "smooth" });
  });
}

// Los títulos grandes de cada categoría aparecen desde el desenfoque a medida que se baja
const vigiaTitulos = "IntersectionObserver" in window && new IntersectionObserver((entradas, vigia) => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    e.target.classList.replace("por-entrar", "entra");
    vigia.unobserve(e.target);
  }
}, { threshold: 0.4 });
function animarTitulos(raiz) {
  if (!vigiaTitulos) return;
  raiz.querySelectorAll(".ed-grande-texto h2, .ed-cab h2, .pasos h2").forEach((h) => {
    h.classList.add("por-entrar");
    vigiaTitulos.observe(h);
  });
}
const repetirEntrada = (el) => { el.classList.remove("entra"); void el.offsetWidth; el.classList.add("entra"); };

// ---------- Toque en fotos: onda tipo burbuja + sonido ----------
// La misma foto se deforma como si una burbuja de vidrio creciera desde el dedo (lente que agranda,
// brillo y colores de pompa en el borde) y al disolverse deja una onda como de agua.
// Se dibuja con la tarjeta gráfica (WebGL); si el teléfono no puede, se ve una burbuja más simple.
// La acción (abrir la categoría o la prenda) espera un poquito para que se alcance a ver.
const ESPERA_ONDA = 360;
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SOMBREADOR_BURBUJA = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D u_foto;
uniform vec2 u_tam;     // tamaño de la foto en px
uniform vec2 u_toque;   // dónde tocaron, en px
uniform vec4 u_cubrir;  // escala y corrimiento de object-fit: cover
uniform float u_radio;  // radio final de la burbuja en px
uniform float u_t;      // segundos desde el toque

vec3 foto(vec2 px) { return texture2D(u_foto, clamp(px * u_cubrir.xy + u_cubrir.zw, 0.0, 1.0)).rgb; }

void main() {
  vec2 p = v * u_tam;
  vec2 d = p - u_toque;
  float dist = length(d);
  vec2 dir = d / max(dist, 0.001);

  // Crece rápido y frena; la piel de la burbuja se ve al principio y se disuelve
  float k = clamp(u_t / 0.55, 0.0, 1.0);
  float R = u_radio * (1.0 - pow(1.0 - k, 3.0)) + 0.001;
  float piel = smoothstep(0.0, 0.06, u_t) * (1.0 - smoothstep(0.30, 0.62, u_t));
  float r = dist / R;
  float dentro = 1.0 - smoothstep(0.98, 1.02, r);

  // Lente: el centro se agranda como vidrio curvo y el borde dobla la luz
  float lente = 0.22 * piel * (1.0 - r * r) * dentro;
  float e = (r - 0.96) / 0.06;
  float borde = 0.10 * piel * exp(-e * e);
  // Onda que queda al disolverse la burbuja
  float o = smoothstep(0.25, 0.45, u_t) * (1.0 - smoothstep(0.55, 0.9, u_t));
  float agua = o * sin(dist * 0.11 - u_t * 26.0) * exp(-dist / (u_radio * 0.9)) * (1.0 - smoothstep(R * 0.9, R * 1.15, dist));
  vec3 col = foto(p - d * lente + dir * (borde * R + agua * 7.0));

  // Volumen, colores de pompa en la piel, brillo de vidrio y sombra suave por fuera
  float ang = atan(d.y, d.x);
  vec3 iris = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + r * 1.4 + ang * 0.16 + u_t * 0.8));
  float anillo = smoothstep(0.86, 0.985, r) * (1.0 - smoothstep(0.985, 1.03, r));
  col *= 1.0 - 0.14 * piel * smoothstep(0.55, 0.97, r) * dentro;
  col += (iris * 0.42 + 0.18) * anillo * piel;
  // Reflejos curvos que siguen el borde (arriba a la izquierda fuerte, abajo a la derecha suave)
  float a1 = abs(mod(ang + 2.25 + 3.14159, 6.28318) - 3.14159);
  float a2 = abs(mod(ang - 0.89 + 3.14159, 6.28318) - 3.14159);
  float brillo = (1.0 - smoothstep(0.0, 0.62, a1)) * smoothstep(0.60, 0.70, r) * (1.0 - smoothstep(0.78, 0.88, r)) * 0.62;
  brillo += (1.0 - smoothstep(0.0, 0.45, a2)) * smoothstep(0.80, 0.86, r) * (1.0 - smoothstep(0.90, 0.95, r)) * 0.30;
  col += brillo * piel * dentro;
  col *= 1.0 - 0.12 * piel * smoothstep(1.0, 1.04, r) * (1.0 - smoothstep(1.04, 1.16, r));
  gl_FragColor = vec4(col, 1.0);
}`;

function crearBurbuja() {
  const lienzo = document.createElement("canvas");
  lienzo.className = "burbuja";
  let gl = null;
  try { gl = lienzo.getContext("webgl", { antialias: false, alpha: false }); } catch {}
  if (!gl) return null;
  const sombreador = (tipo, codigo) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, codigo);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sombreador(gl.VERTEX_SHADER, "attribute vec2 a; varying vec2 v; void main() { v = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5); gl_Position = vec4(a, 0.0, 1.0); }");
  const fs = sombreador(gl.FRAGMENT_SHADER, SOMBREADOR_BURBUJA);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [p, val] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) {
    gl.texParameteri(gl.TEXTURE_2D, p, val);
  }
  const u = Object.fromEntries(["u_tam", "u_toque", "u_cubrir", "u_radio", "u_t"].map((n) => [n, gl.getUniformLocation(prog, n)]));
  const DURACION = 0.95;
  let anim = 0;

  // Dibuja la burbuja sobre la foto visible de la caja; devuelve false si no se puede
  function lanzar(caja, x, y) {
    if (gl.isContextLost()) return false;
    const img = [...caja.querySelectorAll("img")]
      .filter((i) => i.complete && i.naturalWidth && !i.classList.contains("sin-foto") && getComputedStyle(i).opacity > 0.5)
      .pop();
    if (!img) return false;
    const w = img.offsetWidth, h = img.offsetHeight;
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); } catch { return false; } // foto de otro sitio
    cancelAnimationFrame(anim);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    lienzo.style.cssText = `left:${img.offsetLeft}px;top:${img.offsetTop}px;width:${w}px;height:${h}px;filter:${getComputedStyle(img).filter}`;
    gl.viewport(0, 0, lienzo.width, lienzo.height);
    // Igual que object-fit: cover, para que la foto del lienzo calce exacto con la de la página
    const esc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sx = 1 / (esc * img.naturalWidth), sy = 1 / (esc * img.naturalHeight);
    gl.uniform4f(u.u_cubrir, sx, sy, -((w - img.naturalWidth * esc) / 2) * sx, -((h - img.naturalHeight * esc) / 2) * sy);
    gl.uniform2f(u.u_tam, w, h);
    gl.uniform2f(u.u_toque, x - img.offsetLeft, y - img.offsetTop);
    gl.uniform1f(u.u_radio, Math.min(Math.max(Math.min(w, h) * 0.55, 70), 380));
    caja.append(lienzo);
    const inicio = performance.now();
    const cuadro = (ahora) => {
      const t = (ahora - inicio) / 1000;
      if (t >= DURACION) { lienzo.remove(); return; }
      gl.uniform1f(u.u_t, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      anim = requestAnimationFrame(cuadro);
    };
    cuadro(inicio);
    return true;
  }
  return { lanzar };
}
const burbuja = sinMovimiento ? null : crearBurbuja();

function onda(caja, e) {
  sonidoToque();
  if (sinMovimiento) return;
  // Punto tocado dentro de la caja (las fotos del carrusel están achicadas, por eso se corrige la escala)
  const r = caja.getBoundingClientRect();
  const conPunto = e.detail > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  const x = conPunto ? ((e.clientX - r.left) * caja.offsetWidth) / r.width : caja.offsetWidth / 2;
  const y = conPunto ? ((e.clientY - r.top) * caja.offsetHeight) / r.height : caja.offsetHeight / 2;
  if (burbuja && burbuja.lanzar(caja, x, y)) return;
  // Burbuja simple para teléfonos sin WebGL o fotos de ejemplo
  const t = Math.min(Math.max(Math.min(caja.offsetWidth, caja.offsetHeight) * 1.1, 140), 760);
  const s = document.createElement("span");
  s.className = "onda";
  s.style.cssText = `left:${x - t / 2}px;top:${y - t / 2}px;width:${t}px;height:${t}px`;
  s.addEventListener("animationend", () => s.remove());
  caja.append(s);
}

// Elegir una categoría (desde los botones o la foto grande) muestra todos sus productos
function verCategoria(cat) {
  filtro = cat;
  filtroTalla = null;
  pintarFiltros();
  pintarTallas();
  pintarGrilla();
  if (!$("#vista").hidden) repetirEntrada($("#vista-titulo"));
  const arriba = $("#catalogo").getBoundingClientRect().top + scrollY - $(".barra").offsetHeight;
  if (scrollY > arriba) window.scrollTo({ top: arriba, behavior: "smooth" });
}

function pintarGrilla() {
  const q = texto.trim().toLowerCase();
  // Sin categoría ni búsqueda se ve el inicio por categorías; si no, la grilla con todos los productos
  const inicio = filtro === "Todo" && !q;
  $("#editorial").hidden = !inicio;
  $("#vista").hidden = inicio;
  if (inicio) return;
  const lista = PRODUCTOS.filter(
    (p) => (filtro === "Todo" || p.categoria === filtro) &&
      (!filtroTalla || (p.tallas || []).includes(filtroTalla)) &&
      (!q || `${p.nombre} ${p.categoria} ${p.descripcion}`.toLowerCase().includes(q))
  );
  $("#vista-titulo").textContent = q ? `${filtro === "Todo" ? "" : filtro + " · "}“${texto.trim()}”` : filtro;
  $("#vista-cuenta").textContent = lista.length === 1 ? "1 producto" : `${lista.length} productos`;
  $("#grilla").innerHTML = lista
    .map((p) => {
      const f = p.fotos || [];
      return `<article class="card ${p.disponible ? "" : "agotado"}">
        <button class="card-media" data-abrir="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
          ${imgTag(f[0], p.nombre + " · 1", 'class="a" loading="lazy"')}
          ${f[1] ? imgTag(f[1], p.nombre + " · 2", 'class="b" loading="lazy"') : ""}
          ${badge(p)}
        </button>
        <button class="card-info" data-abrir="${esc(p.id)}">
          <h3>${esc(p.nombre)}</h3>
          <p class="card-fotos">${f.length} fotos</p>
          <p class="precio">${precioHtml(p)}</p>
        </button>
      </article>`;
    })
    .join("");
  $("#sin-resultados").hidden = lista.length > 0;
  $("#sin-resultados").textContent = q
    ? "No encontramos productos con esa búsqueda 🐺"
    : filtroTalla
    ? `Por ahora no tenemos talla ${filtroTalla} en ${filtro} 🐺 Pregúntanos por WhatsApp.`
    : "Muy pronto subimos productos en esta categoría 🐺 Pregúntanos por WhatsApp.";
}

$("#filtros").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (b) verCategoria(b.dataset.cat);
});
$("#editorial").addEventListener("click", (e) => {
  const g = e.target.closest("[data-ver-cat]");
  if (g) {
    e.preventDefault();
    // La foto grande de la categoría hace la onda; el botón "Ver todo" suelto abre al tiro
    if (!g.classList.contains("ed-grande")) { verCategoria(g.dataset.verCat); return; }
    onda(g, e);
    setTimeout(() => verCategoria(g.dataset.verCat), ESPERA_ONDA);
    return;
  }
  const prod = e.target.closest("a.ed-prod");
  const media = e.target.closest(".card-media");
  if (!prod || !media || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  onda(media, e);
  setTimeout(() => { location.hash = prod.getAttribute("href").slice(1); }, ESPERA_ONDA);
});
$("#filtro-tallas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-talla]");
  if (!b) return;
  filtroTalla = b.dataset.talla || null;
  pintarTallas();
  pintarGrilla();
});
$("#buscar").addEventListener("input", (e) => { texto = e.target.value; pintarGrilla(); });
$("#grilla").addEventListener("click", (e) => {
  const b = e.target.closest("[data-abrir]");
  if (!b) return;
  const abrir = () => { location.hash = "producto=" + b.dataset.abrir; };
  if (!b.classList.contains("card-media")) { abrir(); return; }
  onda(b, e);
  setTimeout(abrir, ESPERA_ONDA);
});

// ---------- Ficha de producto ----------
let actual = null, fotoIdx = 0, sel = {};

function abrirProducto(id) {
  const p = buscarProducto(id);
  if (!p) return;
  actual = p;
  fotoIdx = 0;
  sel = {
    talla: p.tallas.length === 1 ? p.tallas[0] : null,
    color: p.colores.length === 1 ? p.colores[0] : null,
    cant: 1,
  };
  pintarDetalle();
  pintarFoto();
  $("#modal").hidden = false;
  document.body.classList.add("bloqueado");
}

function cerrarProducto() {
  $("#visor").hidden = true;
  $("#modal").hidden = true;
  document.body.classList.remove("bloqueado");
  actual = null;
  if (location.hash.startsWith("#producto=")) history.replaceState(null, "", location.pathname + location.search);
}

function pintarFoto() {
  const f = actual.fotos;
  const img = $("#g-img");
  img.classList.remove("sin-foto");
  img.onerror = () => ph(img);
  img.dataset.ph = `${actual.nombre} · ${fotoIdx + 1}`;
  img.alt = img.dataset.ph;
  img.src = foto(f[fotoIdx], 1200);
  $("#g-contador").textContent = `${fotoIdx + 1} / ${f.length}`;
  const varias = f.length > 1;
  $("#g-ant").hidden = $("#g-sig").hidden = !varias;
  $("#g-minis").innerHTML = f
    .map((src, i) => `<button data-foto="${i}" aria-current="${i === fotoIdx}" aria-label="Foto ${i + 1}">${imgTag(src, String(i + 1), "", 200)}</button>`)
    .join("");
}
const moverFoto = (d) => {
  const n = actual.fotos.length;
  fotoIdx = (fotoIdx + d + n) % n;
  pintarFoto();
};

function grupoOpciones(nombre, clave, valores) {
  if (!valores.length) return "";
  return `<div class="opcion"><h4>${nombre}: <b>${esc(sel[clave] || "elige una")}</b></h4>
    <div class="opciones">${valores
      .map((v) => `<button data-opt="${clave}" data-val="${esc(v)}" aria-pressed="${sel[clave] === v}">${esc(v)}</button>`)
      .join("")}</div></div>`;
}

function pintarDetalle() {
  const p = actual;
  $("#detalle").innerHTML = `
    <p class="cat">${esc(p.categoria)}</p>
    <h2 id="m-nombre">${esc(p.nombre)}</h2>
    <p class="precio">${precioHtml(p)}</p>
    <p class="desc">${esc(p.descripcion)}</p>
    ${grupoOpciones("Talla", "talla", p.tallas)}
    ${grupoOpciones("Color", "color", p.colores)}
    ${p.disponible ? `
      <div class="opcion"><h4>Cantidad</h4>
        <div class="cantidad"><button data-cant="-1" aria-label="Menos">−</button><span>${sel.cant}</span><button data-cant="1" aria-label="Más">+</button></div>
      </div>
      <p class="aviso-opcion" id="aviso-opcion"></p>
      <div class="acciones">
        <button class="btn btn-oro" data-accion="agregar">Agregar al carrito</button>
        <button class="btn btn-wa" data-accion="pedir">Pedir ahora por WhatsApp</button>
        <button class="compartir" data-accion="compartir">Copiar link de este producto</button>
      </div>` : `
      <div class="acciones">
        <button class="btn btn-borde" data-wa="${esc(`Hola ${TIENDA.nombre} 🐺 ¿Cuándo vuelve a llegar "${p.nombre}"?`)}">Avísame cuando llegue</button>
      </div>`}`;
}

function faltaOpcion() {
  if (actual.tallas.length && !sel.talla) return "Elige una talla";
  if (actual.colores.length && !sel.color) return "Elige un color";
  return "";
}
const descripcionItem = (i) => [i.talla && `Talla ${i.talla}`, i.color && `Color ${i.color}`].filter(Boolean).join(" · ");

$("#detalle").addEventListener("click", async (e) => {
  const opt = e.target.closest("[data-opt]");
  if (opt) { sel[opt.dataset.opt] = opt.dataset.val; pintarDetalle(); return; }
  const c = e.target.closest("[data-cant]");
  if (c) { sel.cant = Math.max(1, Math.min(20, sel.cant + Number(c.dataset.cant))); pintarDetalle(); return; }
  const a = e.target.closest("[data-accion]");
  if (!a) return;
  const accion = a.dataset.accion;

  if (accion === "compartir") {
    const url = linkProducto(actual);
    try { await navigator.clipboard.writeText(url); aviso("Link copiado 🔗"); }
    catch { prompt("Copia este link:", url); }
    return;
  }
  const falta = faltaOpcion();
  if (falta) { $("#aviso-opcion").textContent = falta; return; }
  const item = { id: actual.id, talla: sel.talla, color: sel.color, cant: sel.cant };

  if (accion === "pedir") {
    const d = descripcionItem(item);
    enviarWa(
      `Hola ${TIENDA.nombre} 🐺 Quiero este producto:\n\n• ${item.cant}x ${actual.nombre}${d ? ` (${d})` : ""} – ${fmt(actual.precio * item.cant)}\n📸 ${linkProducto(actual)}\n\n¿Me confirman disponibilidad?`
    );
    return;
  }
  agregarABolsa(item);
  cerrarProducto();
  aviso("Agregado al carrito 🛒");
});

$("#g-ant").addEventListener("click", () => moverFoto(-1));
$("#g-sig").addEventListener("click", () => moverFoto(1));
$("#g-minis").addEventListener("click", (e) => {
  const b = e.target.closest("[data-foto]");
  if (b) { fotoIdx = Number(b.dataset.foto); pintarFoto(); }
});
let toqueX = null;
$("#g-principal").addEventListener("touchstart", (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
$("#g-principal").addEventListener("touchend", (e) => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX;
  if (Math.abs(dx) > 40) moverFoto(dx < 0 ? 1 : -1);
  toqueX = null;
});
$("#modal").addEventListener("click", (e) => { if (e.target.closest("[data-cerrar]")) cerrarProducto(); });

// ---------- Visor a pantalla completa con zoom (al tocar la foto de la ficha) ----------
// Toque/clic = zoom donde tocaste · con zoom: mover el mouse o arrastrar el dedo recorre la foto
// Sin zoom: deslizar o flechas para cambiar de foto
const visor = $("#visor"), vImg = $("#visor-img"), vEscena = $("#visor-escena");
const ZOOM = 2.5;
let vIdx = 0, zoom = false, origen = { x: 50, y: 50 }, gesto = null;

function aplicarZoom() {
  vImg.style.transformOrigin = `${origen.x}% ${origen.y}%`;
  vImg.style.transform = zoom ? `scale(${ZOOM})` : "";
  visor.classList.toggle("con-zoom", zoom);
}
function pintarVisor() {
  const f = actual.fotos;
  zoom = false;
  aplicarZoom();
  vImg.classList.remove("sin-foto");
  vImg.onerror = () => ph(vImg);
  vImg.alt = `${actual.nombre} · ${vIdx + 1}`;
  vImg.src = foto(f[vIdx], 2000);
  $("#visor-contador").textContent = `${vIdx + 1} / ${f.length}`;
  $("#visor-ant").hidden = $("#visor-sig").hidden = $("#visor-minis").hidden = f.length < 2;
  $("#visor-minis").innerHTML = f
    .map((src, i) => `<button data-vfoto="${i}" aria-current="${i === vIdx}" aria-label="Foto ${i + 1}">${imgTag(src, String(i + 1), "", 200)}</button>`)
    .join("");
}
function abrirVisor() {
  if (!actual || !actual.fotos.length) return;
  vIdx = fotoIdx;
  pintarVisor();
  visor.hidden = false;
}
function cerrarVisor() {
  if (visor.hidden) return;
  visor.hidden = true;
  zoom = false;
  aplicarZoom();
  if (actual) { fotoIdx = vIdx; pintarFoto(); }
}
const moverVisor = (d) => {
  const n = actual.fotos.length;
  vIdx = (vIdx + d + n) % n;
  pintarVisor();
};
// Posición del dedo o mouse dentro de la foto, en %
const puntoEn = (x, y) => {
  const r = vEscena.getBoundingClientRect();
  return {
    x: Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)),
    y: Math.min(100, Math.max(0, ((y - r.top) / r.height) * 100)),
  };
};

$("#g-img").addEventListener("click", (e) => {
  onda($("#g-principal"), e);
  setTimeout(abrirVisor, ESPERA_ONDA);
});
$("#g-ampliar").addEventListener("click", abrirVisor);
$("#visor-cerrar").addEventListener("click", cerrarVisor);
$("#visor-ant").addEventListener("click", () => moverVisor(-1));
$("#visor-sig").addEventListener("click", () => moverVisor(1));
$("#visor-minis").addEventListener("click", (e) => {
  const b = e.target.closest("[data-vfoto]");
  if (b) { vIdx = Number(b.dataset.vfoto); pintarVisor(); }
});

vEscena.addEventListener("pointerdown", (e) => {
  gesto = { x: e.clientX, y: e.clientY, origen: { ...origen }, tipo: e.pointerType };
  try { vEscena.setPointerCapture(e.pointerId); } catch {}
});
vEscena.addEventListener("pointermove", (e) => {
  if (!zoom) return;
  if (e.pointerType === "mouse") {
    // Con mouse la foto sigue al cursor, como en las tiendas grandes
    origen = puntoEn(e.clientX, e.clientY);
    aplicarZoom();
  } else if (gesto) {
    // Con el dedo: arrastrar mueve la foto en la dirección del dedo (1 px de dedo = 1 px de foto)
    const r = vEscena.getBoundingClientRect();
    origen = {
      x: Math.min(100, Math.max(0, gesto.origen.x - ((e.clientX - gesto.x) / r.width) * 100 / (ZOOM - 1))),
      y: Math.min(100, Math.max(0, gesto.origen.y - ((e.clientY - gesto.y) / r.height) * 100 / (ZOOM - 1))),
    };
    aplicarZoom();
  }
});
vEscena.addEventListener("pointerup", (e) => {
  if (!gesto) return;
  const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y;
  const fueToque = Math.abs(dx) < 8 && Math.abs(dy) < 8;
  if (fueToque) {
    if (vImg.classList.contains("sin-foto")) { gesto = null; return; }
    if (!zoom) origen = puntoEn(e.clientX, e.clientY);
    zoom = !zoom;
    aplicarZoom();
  } else if (!zoom && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && actual.fotos.length > 1) {
    moverVisor(dx < 0 ? 1 : -1);
  }
  gesto = null;
});
vEscena.addEventListener("pointercancel", () => { gesto = null; });

// ---------- Carrito ----------
function agregarABolsa(item) {
  const igual = bolsa.find((i) => i.id === item.id && i.talla === item.talla && i.color === item.color);
  if (igual) igual.cant = Math.min(20, igual.cant + item.cant);
  else bolsa.push(item);
  guardarBolsa();
  pintarBolsa();
}

function totalBolsa() {
  return bolsa.reduce((t, i) => t + buscarProducto(i.id).precio * i.cant, 0);
}

function pintarBolsa() {
  const unidades = bolsa.reduce((t, i) => t + i.cant, 0);
  const cont = $("#contador-bolsa");
  cont.hidden = unidades === 0;
  cont.textContent = unidades;
  $("#bolsa-total").textContent = fmt(totalBolsa());
  $("#enviar-pedido").disabled = bolsa.length === 0;
  $("#bolsa-items").innerHTML = bolsa.length
    ? bolsa.map((i, idx) => {
        const p = buscarProducto(i.id);
        return `<div class="item">
          ${imgTag(p.fotos[0], p.nombre, "", 200)}
          <div><h4>${esc(p.nombre)}</h4><p>${esc(descripcionItem(i))}</p><p class="precio">${fmt(p.precio * i.cant)}</p></div>
          <div class="item-ctrl">
            <div class="cantidad"><button data-item="${idx}" data-d="-1" aria-label="Menos">−</button><span>${i.cant}</span><button data-item="${idx}" data-d="1" aria-label="Más">+</button></div>
            <button class="quitar" data-quitar="${idx}">Quitar</button>
          </div>
        </div>`;
      }).join("")
    : `<p class="bolsa-vacia">Tu carrito está vacío 🐺<br>Elige algo del catálogo.</p>`;
}

function abrirBolsa() {
  $("#bolsa").hidden = $("#bolsa-fondo").hidden = false;
  document.body.classList.add("bloqueado");
}
function cerrarBolsa() {
  $("#bolsa").hidden = $("#bolsa-fondo").hidden = true;
  if ($("#modal").hidden) document.body.classList.remove("bloqueado");
}

$("#abrir-bolsa").addEventListener("click", abrirBolsa);
$("#cerrar-bolsa").addEventListener("click", cerrarBolsa);
$("#bolsa-fondo").addEventListener("click", cerrarBolsa);
$("#bolsa-items").addEventListener("click", (e) => {
  const q = e.target.closest("[data-quitar]");
  const d = e.target.closest("[data-d]");
  if (q) bolsa.splice(Number(q.dataset.quitar), 1);
  else if (d) {
    const i = bolsa[Number(d.dataset.item)];
    i.cant += Number(d.dataset.d);
    if (i.cant < 1) bolsa.splice(Number(d.dataset.item), 1);
  } else return;
  guardarBolsa();
  pintarBolsa();
});
$("#enviar-pedido").addEventListener("click", () => {
  if (!bolsa.length) return;
  const lineas = bolsa.map((i) => {
    const p = buscarProducto(i.id);
    const d = descripcionItem(i);
    return `• ${i.cant}x ${p.nombre}${d ? ` (${d})` : ""} – ${fmt(p.precio * i.cant)}\n📸 ${linkProducto(p)}`;
  });
  enviarWa(
    `Hola ${TIENDA.nombre} 🐺 Quiero hacer este pedido:\n\n${lineas.join("\n\n")}\n\nTotal: ${fmt(totalBolsa())}\n\n¿Me confirman disponibilidad?`
  );
});

// ---------- Avisos, teclado y links directos ----------
let avisoTimer;
function aviso(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => (t.hidden = true), 2200);
}

document.addEventListener("keydown", (e) => {
  if (!visor.hidden) {
    if (e.key === "Escape") cerrarVisor();
    if (e.key === "ArrowLeft") moverVisor(-1);
    if (e.key === "ArrowRight") moverVisor(1);
    return;
  }
  if (e.key === "Escape") { if (!$("#modal").hidden) cerrarProducto(); else cerrarBolsa(); }
  if (actual && e.key === "ArrowLeft") moverFoto(-1);
  if (actual && e.key === "ArrowRight") moverFoto(1);
});

// Los links tipo tusitio.com/#producto=gorra-negra abren directo la ficha (útil para historias de Instagram)
function revisarHash() {
  const m = location.hash.match(/^#producto=(.+)$/);
  if (m) abrirProducto(decodeURIComponent(m[1]));
  else if (actual) cerrarProducto();
}
window.addEventListener("hashchange", revisarHash);

// ---------- El Perchero de Lobo ----------
// Prendas colgadas DE LADO en un riel, como un perchero de tienda mirado de frente (caben unas 4 a lo ancho).
// En el panel, cada producto tiene la casilla "Colgar en El Perchero de Lobo": se cuelgan solo los marcados
// (en el orden de la lista). Si no hay ninguno marcado, la sección no aparece.
// Fotos: lo ideal son 3 PNG sin fondo con la prenda en su percha de madera (prompts PERCHERO del manual): de frente,
// de lado (como cuelga en el riel) y de espalda. Al tocar una prenda, corre por el riel hasta el centro y se
// da vuelta de frente (las de al lado le hacen espacio); al tocarla otra vez se acerca grande y se puede girar.
// Sin foto de lado, cuelga de frente con una percha de nogal dibujada; sin ningún PNG, la página recorta sola
// la foto de la prenda sola (fondo claro y liso, como las del prompt CATÁLOGO · FRENTE PLANA FLOTANDO).
const PERCHERO = ["Poleras", "Polerones"]; // la sección va justo después de la primera de estas categorías
const PERCHERO_NO_CUELGAN = ["Gorras", "Lentes", "Accesorios"];
const PERCHERO_PINZAS = ["Pantalones", "Shorts"]; // estos van en percha de pinzas, tomados de la pretina
const PERCHERO_MAX = 16;

function percheroHtml() {
  return `<section class="ed-bloque perchero-bloque" id="perchero-bloque">
    <div class="ed-cab"><h2>El Perchero de Lobo</h2></div>
    <div class="perchero cargando esperando" id="perchero">
      <svg class="perchero-defs" width="0" height="0" aria-hidden="true">
        <!-- Nogal lacado: redondeado, con la luz al centro y los cantos más oscuros -->
        <linearGradient id="perchero-nogal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#2e170a"/><stop offset=".3" stop-color="#6b3e1f"/><stop offset=".48" stop-color="#8d5732"/>
          <stop offset=".75" stop-color="#55301a"/><stop offset="1" stop-color="#2a1408"/>
        </linearGradient>
        <linearGradient id="perchero-nogal-barra" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#8d5732"/><stop offset=".45" stop-color="#6b3e1f"/><stop offset="1" stop-color="#2e170a"/>
        </linearGradient>
        <linearGradient id="perchero-acero" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#7b8088"/><stop offset=".35" stop-color="#eef0f2"/><stop offset="1" stop-color="#6f747c"/>
        </linearGradient>
        <!-- Vetas de la madera: líneas finas a lo largo de la pieza (verticales en el cuello, horizontales en la barra) -->
        <filter id="perchero-veta" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".9 .035" numOctaves="2" seed="11" result="ruido"/>
          <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 .16  0 0 0 0 .08  0 0 0 0 .03  0 0 0 -1.1 .62" result="veta"/>
          <feComposite in="veta" in2="SourceAlpha" operator="in" result="vetaDentro"/>
          <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vetaDentro"/></feMerge>
        </filter>
        <filter id="perchero-veta-h" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".035 .9" numOctaves="2" seed="5" result="ruido"/>
          <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 .16  0 0 0 0 .08  0 0 0 0 .03  0 0 0 -1.1 .62" result="veta"/>
          <feComposite in="veta" in2="SourceAlpha" operator="in" result="vetaDentro"/>
          <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vetaDentro"/></feMerge>
        </filter>
        <!-- Sombras suaves: la madera sobre la prenda y el gancho sobre la pared -->
        <filter id="perchero-sombra" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#000" flood-opacity=".35"/>
        </filter>
        <filter id="perchero-sombra-gancho" x="-200%" y="-20%" width="500%" height="140%">
          <feDropShadow dx="1.2" dy="1.6" stdDeviation="1.1" flood-color="#000" flood-opacity=".2"/>
        </filter>
        <!-- Lobo grabado a fuego en la barra de la percha de pinzas -->
        <filter id="perchero-grabado" x="-10%" y="-10%" width="120%" height="130%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 .14  0 0 0 0 .07  0 0 0 0 .03  -.3 -.59 -.11 0 1" result="lineas"/>
          <feComposite in="lineas" in2="SourceAlpha" operator="in" result="lineasDentro"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 .3  0 0 0 0 .17  0 0 0 0 .08  0 0 0 .3 0" result="tostado"/>
          <feOffset in="SourceAlpha" dy=".7" result="abajo"/>
          <feColorMatrix in="abajo" type="matrix" values="0 0 0 0 1  0 0 0 0 .86  0 0 0 0 .7  0 0 0 .35 0" result="brillo"/>
          <feComposite in="brillo" in2="SourceAlpha" operator="out" result="borde"/>
          <feMerge><feMergeNode in="borde"/><feMergeNode in="tostado"/><feMergeNode in="lineasDentro"/></feMerge>
        </filter>
      </svg>
      <img class="perchero-logo" src="img/logo-lobo-128.png" alt="" width="128" height="128">
      <div class="perchero-suelo" aria-hidden="true"></div>
      <div class="perchero-riel" aria-hidden="true"></div>
      <div class="perchero-pista" id="perchero-pista" aria-label="Prendas colgadas"></div>
      <button class="flecha izq" data-correr="-1" aria-label="Prendas anteriores">‹</button>
      <button class="flecha der" data-correr="1" aria-label="Prendas siguientes">›</button>
      <button class="perchero-cerrar" id="perchero-cerrar" aria-label="Volver al perchero">×</button>
      <div class="perchero-info" id="perchero-info" aria-live="polite"><p class="pi-pista">Colgando la ropa…</p></div>
    </div>
  </section>`;
}

const cargarImagen = (src) => new Promise((ok, mal) => {
  const i = new Image();
  i.decoding = "async";
  i.onload = () => ok(i);
  i.onerror = mal;
  i.src = foto(src, 1200);
});

// Foto que la tienda ya subió sin fondo (PNG hecho en Canva): se usa tal cual, solo se le mide dónde va el
// gancho y la forma de los hombros. Devuelve lo mismo que recortarPrenda, o null si la foto no tiene fondo
// transparente (en ese caso se recorta como cualquier otra foto).
async function prendaSinFondo(src, anchoMax) {
  if (!src) return null;
  let img;
  try { img = await cargarImagen(src); } catch { return null; }
  const k = Math.min(1, anchoMax / img.naturalWidth);
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k), n = w * h;
  if (w < 60 || h < 60) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  let px;
  try { px = g.getImageData(0, 0, w, h).data; } catch { return null; }
  let transparentes = 0, bx0 = w, bx1 = 0, by0 = h, by1 = 0;
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3];
    if (a < 20) { transparentes++; continue; }
    if (a < 128) continue;
    const x = i % w, y = (i - x) / w;
    if (x < bx0) bx0 = x;
    if (x > bx1) bx1 = x;
    if (y < by0) by0 = y;
    if (y > by1) by1 = y;
  }
  if (transparentes < n * 0.05 || bx1 <= bx0 || by1 <= by0) return null;
  const lleno = (x, y) => px[(y * w + x) * 4 + 3] >= 128;
  const cx = Math.round((bx0 + bx1) / 2), r = Math.max(2, Math.round((bx1 - bx0) * 0.04));
  let arriba = by1;
  for (let x = cx - r; x <= cx + r; x++) for (let y = by0; y < arriba; y++) if (lleno(x, y)) { arriba = y; break; }
  const m = 2, cw = bx1 - bx0 + 1 + m * 2, ch = by1 - by0 + 1 + m * 2;
  const perfil = [];
  for (let j = 0; j <= 20; j++) {
    const x = Math.round(bx0 + ((bx1 - bx0) * j) / 20);
    let y = by0;
    while (y < by1 && !lleno(x, y)) y++;
    perfil.push([x - bx0 + m, y - by0 + m]);
  }
  const lienzo = document.createElement("canvas");
  lienzo.width = cw;
  lienzo.height = ch;
  lienzo.getContext("2d").drawImage(c, bx0 - m, by0 - m, cw, ch, 0, 0, cw, ch);
  c.width = 0;
  return { lienzo, gx: cx - bx0 + m, gy: arriba - by0 + m, perfil, fondo: null };
}

// Recorta la prenda de una foto con fondo claro y liso (fuente: la ruta de la foto o la foto ya cargándose).
// Devuelve { lienzo, gx, gy, fondo } (gx, gy: dónde entra el gancho, en px del lienzo) o null si la foto no sirve.
async function recortarPrenda(fuente, anchoMax) {
  if (!fuente) return null;
  let img;
  try { img = await (typeof fuente === "string" ? cargarImagen(fuente) : fuente); } catch { return null; }
  if (!img) return null;
  const k = Math.min(1, anchoMax / img.naturalWidth);
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k), n = w * h;
  if (w < 120 || h < 120) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  let datos;
  try { datos = g.getImageData(0, 0, w, h); } catch { return null; }
  const px = datos.data;

  // 1) Color del fondo: se mide en 8 trozos del borde y se arma una grilla de 3x3 que sigue el degradado
  const banda = Math.max(3, Math.round(Math.min(w, h) * 0.02)), L = banda * 3;
  const medir = (x0, y0, x1, y1) => {
    const r = [], v = [], a = [];
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * 4;
      r.push(px[i]); v.push(px[i + 1]); a.push(px[i + 2]);
    }
    const med = (l) => l.sort((p, q) => p - q)[l.length >> 1];
    return [med(r), med(v), med(a)];
  };
  const x0 = Math.round(w * 0.4), x1 = Math.round(w * 0.6), y0 = Math.round(h * 0.4), y1 = Math.round(h * 0.6);
  const F = [
    [medir(0, 0, L, L), medir(x0, 0, x1, banda), medir(w - L, 0, w, L)],
    [medir(0, y0, banda, y1), null, medir(w - banda, y0, w, y1)],
    [medir(0, h - L, L, h), medir(x0, h - banda, x1, h), medir(w - L, h - L, w, h)],
  ];
  F[1][1] = [0, 1, 2].map((j) => (F[0][1][j] + F[2][1][j] + F[1][0][j] + F[1][2][j]) / 4);

  // 2) Para cada punto: qué tan distinto es del fondo esperado, cuánto más claro que el fondo es
  //    y si tiene el mismo tono del fondo: más oscuro (sombra, tono 1) o más claro (foco de luz, tono 2)
  const dist = new Uint8Array(n), luz = new Uint8Array(n), mas = new Int16Array(n), tono = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    const fv = (y / (h - 1)) * 2, j = fv < 1 ? 0 : 1, tv = fv - j;
    // fondo esperado en esta fila, en la izquierda, el centro y la derecha
    const fila = [0, 1, 2].map((i) => [0, 1, 2].map((ch) => F[j][i][ch] * (1 - tv) + F[j + 1][i][ch] * tv));
    for (let x = 0; x < w; x++) {
      const fu = (x / (w - 1)) * 2, i = fu < 1 ? 0 : 1, tu = fu - i, p = (y * w + x) * 4, a = fila[i], b = fila[i + 1], k = y * w + x;
      const f0 = a[0] + (b[0] - a[0]) * tu, f1 = a[1] + (b[1] - a[1]) * tu, f2 = a[2] + (b[2] - a[2]) * tu;
      const r0 = px[p], g0 = px[p + 1], b0 = px[p + 2];
      const d0 = Math.abs(r0 - f0), d1 = Math.abs(g0 - f1), d2 = Math.abs(b0 - f2);
      const m = d0 > d1 ? (d0 > d2 ? d0 : d2) : d1 > d2 ? d1 : d2;
      dist[k] = m > 255 ? 255 : m;
      const l = (r0 * 77 + g0 * 150 + b0 * 29) >> 8;
      luz[k] = l;
      mas[k] = l - (f0 * 77 + f1 * 150 + f2 * 29) / 256;
      const q0 = r0 / f0, q1 = g0 / f1, q2 = b0 / f2, s = (q0 + q1 + q2) / 3;
      const abre = Math.max(q0, q1, q2) - Math.min(q0, q1, q2);
      if (s >= 0.7 && s < 0.985 && abre < 0.06) tono[k] = 1;
      else if (s > 1 && s < 1.25 && abre < 0.04) tono[k] = 2;
    }
  }

  // 3) El borde de la foto tiene que ser fondo claro y parejo; si no (foto en la calle, con modelo), no sirve
  const hist = new Uint32Array(256), histMas = new Uint32Array(256);
  let total = 0;
  const contar = (k) => { hist[dist[k]]++; histMas[Math.max(0, Math.min(255, mas[k] + 128))]++; total++; };
  for (let x = 0; x < w; x++) { contar(x); contar(w + x); contar((h - 2) * w + x); contar((h - 1) * w + x); }
  for (let y = 2; y < h - 2; y++) { contar(y * w); contar(y * w + 1); contar(y * w + w - 2); contar(y * w + w - 1); }
  const p90 = (hs) => { let acum = 0, v = 0; for (; v < 255; v++) { acum += hs[v]; if (acum >= total * 0.9) break; } return v; };
  const ruidoFondo = p90(hist), ruidoClaro = p90(histMas) - 128;
  const claro = (F[0][1][0] + F[0][1][1] + F[0][1][2]) / 3;
  if (ruidoFondo > 16 || claro < 150) return null;
  // T: cuánto puede variar el fondo · CLARO: cuánto más claro que el fondo puede ser (una prenda blanca lo es más)
  const T = Math.min(16, Math.max(8, ruidoFondo + 6)), CLARO = Math.min(10, Math.max(4, ruidoClaro + 3));

  // 4) Separar prenda y fondo, como las herramientas de recorte profesionales:
  //    a) mapa de bordes: qué tan marcado es el cambio de brillo o de color en cada punto (suavizado
  //       en 3x3 para que el grano de la foto no moleste)
  //    b) fondo seguro: desde las orillas de la foto, por donde el color es el del fondo (o un foco de luz
  //       del mismo tono) y sin cruzar ningún borde. Las sombras se dejan para el reparto del final:
  //       una prenda clara sombreada se parece a una sombra y por ahí se colaría el fondo
  //    c) prenda segura: lo que se aleja harto del fondo (estampado, cuello, tela de color), lo que es más
  //       claro que el fondo sin estar unido a él (una prenda blanca) y el centro de la foto
  //    d) el resto se reparte creciendo desde los dos lados a la vez, de lo más parejo a lo más marcado:
  //       la frontera queda en el borde más marcado entre los dos, que es el contorno de la prenda
  const fila = new Uint16Array(n), luz9 = new Uint16Array(n), dist9 = new Uint16Array(n), relieve = new Uint8Array(n);
  for (let i = 1; i < n - 1; i++) fila[i] = luz[i - 1] + luz[i] + luz[i + 1];
  for (let i = w; i < n - w; i++) luz9[i] = fila[i - w] + fila[i] + fila[i + w];
  for (let i = 1; i < n - 1; i++) fila[i] = dist[i - 1] + dist[i] + dist[i + 1];
  for (let i = w; i < n - w; i++) dist9[i] = fila[i - w] + fila[i] + fila[i + w];
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x;
    const gl = Math.abs(luz9[i + 1] - luz9[i - 1]) + Math.abs(luz9[i + w] - luz9[i - w]);
    const gd = Math.abs(dist9[i + 1] - dist9[i - 1]) + Math.abs(dist9[i + w] - dist9[i - w]);
    const g = (gl > gd ? gl : gd) / 9;
    relieve[i] = g > 255 ? 255 : g;
  }
  // Muro: el borde engrosado 1 px hacia cada lado, para que el fondo no se cuele por un hueco de un punto
  const muro = new Uint8Array(n), max3 = (a, b, c) => (a > b ? (a > c ? a : c) : b > c ? b : c);
  for (let i = 1; i < n - 1; i++) fila[i] = max3(relieve[i - 1], relieve[i], relieve[i + 1]);
  for (let i = w; i < n - w; i++) muro[i] = max3(fila[i - w], fila[i], fila[i + w]);
  // Cuánto "borde" tiene el fondo de por sí (grano, degradado): se mide cerca de las orillas de la foto
  const histR = new Uint32Array(256);
  let totalR = 0;
  for (let x = 3; x < w - 3; x++) for (const y of [3, h - 4]) { histR[muro[y * w + x]]++; totalR++; }
  for (let y = 4; y < h - 4; y++) for (const x of [3, w - 4]) { histR[muro[y * w + x]]++; totalR++; }
  let acumR = 0, BARRERA = 0;
  for (; BARRERA < 255; BARRERA++) { acumR += histR[BARRERA]; if (acumR >= totalR * 0.95) break; }
  BARRERA = Math.min(12, Math.max(4, BARRERA + 3));
  const SEGURO = Math.min(T, 10);
  const marca = new Uint8Array(n), cola = new Int32Array(n); // marca: 1 = fondo, 2 = prenda
  let ini = 0, fin = 0;
  const crecer = (k) => {
    if (marca[k] || muro[k] > BARRERA || !((dist[k] <= SEGURO && mas[k] <= CLARO) || tono[k] === 2)) return;
    marca[k] = 1;
    cola[fin++] = k;
  };
  for (let x = 0; x < w; x++) { crecer(x); crecer((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { crecer(y * w); crecer(y * w + w - 1); }
  while (ini < fin) {
    const i = cola[ini++], x = i % w;
    if (x > 0) crecer(i - 1);
    if (x < w - 1) crecer(i + 1);
    if (i >= w) crecer(i - w);
    if (i < n - w) crecer(i + w);
  }
  const mx = Math.round(w * 0.04), my = Math.round(h * 0.04);
  let semillas = 0;
  for (let y = my; y < h - my; y++) for (let x = mx; x < w - mx; x++) {
    const k = y * w + x;
    if (marca[k] || tono[k] === 1) continue;
    const centro = Math.abs(x - w / 2) < w * 0.05 && Math.abs(y - h / 2) < h * 0.1;
    if (dist[k] > 45 || mas[k] > CLARO + 3 || centro) { marca[k] = 2; semillas++; }
  }
  if (semillas < n * 0.01) return null;
  // Cola por niveles de relieve: cada punto entra una vez y toma el lado de sus vecinos ya decididos
  const niveles = Array.from({ length: 256 }, () => []), enCola = new Uint8Array(n);
  const meter = (j, nivel) => {
    if (marca[j] || enCola[j]) return;
    enCola[j] = 1;
    niveles[relieve[j] > nivel ? relieve[j] : nivel].push(j);
  };
  const vecinosDe = (i, nivel) => {
    const x = i % w;
    if (x > 0) meter(i - 1, nivel);
    if (x < w - 1) meter(i + 1, nivel);
    if (i >= w) meter(i - w, nivel);
    if (i < n - w) meter(i + w, nivel);
  };
  for (let i = 0; i < n; i++) if (marca[i]) vecinosDe(i, 0);
  for (let nivel = 0; nivel < 256; nivel++) {
    const lista = niveles[nivel];
    for (let k = 0; k < lista.length; k++) {
      const i = lista[k], x = i % w;
      let f = 0, p = 0, m = 0;
      if (x > 0) { m = marca[i - 1]; f |= m === 1; p |= m === 2; }
      if (x < w - 1) { m = marca[i + 1]; f |= m === 1; p |= m === 2; }
      if (i >= w) { m = marca[i - w]; f |= m === 1; p |= m === 2; }
      if (i < n - w) { m = marca[i + w]; f |= m === 1; p |= m === 2; }
      // Justo en la frontera decide el color: si se aleja del fondo, es prenda
      marca[i] = f && p ? (dist[i] > T ? 2 : 1) : p ? 2 : 1;
      vecinosDe(i, nivel);
    }
    niveles[nivel] = null;
  }
  const fondo = new Uint8Array(n);
  for (let i = 0; i < n; i++) fondo[i] = marca[i] !== 2 ? 1 : 0;

  // 5) Se queda solo con la prenda (la mancha más grande) y se borran motitas sueltas
  const grupo = new Int32Array(n), tamanos = [0];
  let mayor = 0, b = 0, id = 0;
  const unir = (j) => { if (!fondo[j] && !grupo[j]) { grupo[j] = id; cola[b++] = j; } };
  for (let s = 0; s < n; s++) {
    if (fondo[s] || grupo[s]) continue;
    id = tamanos.length;
    let a = 0;
    b = 0;
    cola[b++] = s;
    grupo[s] = id;
    while (a < b) {
      const i = cola[a++], x = i % w;
      if (x > 0) unir(i - 1);
      if (x < w - 1) unir(i + 1);
      if (i >= w) unir(i - w);
      if (i < n - w) unir(i + w);
    }
    tamanos.push(b);
    if (b > mayor) mayor = b;
  }
  const minimo = mayor * 0.03, prenda = new Uint8Array(n);
  let area = 0, toca = 0;
  for (let i = 0; i < n; i++) if (!fondo[i] && tamanos[grupo[i]] >= minimo) { prenda[i] = 1; area++; }
  for (let x = 0; x < w; x++) toca += prenda[x] + prenda[(h - 1) * w + x];
  for (let y = 0; y < h; y++) toca += prenda[y * w] + prenda[y * w + w - 1];
  // Muy chica, casi toda la foto o cortada por el borde (foto de detalle): no sirve para colgar
  if (area < n * 0.07 || area > n * 0.85 || toca > (w + h) * 2 * 0.03) return null;
  // Control de calidad: lo que se ve claramente distinto al fondo (estampado, cuello, tela) no puede quedar
  // fuera del contorno recortado (con un margen para las sombras pegadas a la prenda). Si queda afuera,
  // el recorte salió roto (pasa con prendas claras muy sombreadas) y esa prenda no se cuelga.
  let px0 = w, px1 = 0, py0 = h, py1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (prenda[y * w + x]) {
    if (x < px0) px0 = x;
    if (x > px1) px1 = x;
    if (y < py0) py0 = y;
    if (y > py1) py1 = y;
  }
  const holgura = Math.round(Math.min(w, h) * 0.03);
  let afuera = 0;
  for (let y = my; y < h - my; y++) for (let x = mx; x < w - mx; x++) {
    if (dist[y * w + x] > 45 && (x < px0 - holgura || x > px1 + holgura || y < py0 - holgura || y > py1 + holgura)) afuera++;
  }
  if (afuera > area * 0.002) return null;

  // 6) Borde suave: se achica 1 px (ahí se mezcla el fondo) y se difumina, como un recorte profesional
  const nucleo = new Uint8Array(n);
  let bx0 = w, bx1 = 0, by0 = h, by1 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (prenda[i] && prenda[i - 1] && prenda[i + 1] && prenda[i - w] && prenda[i + w]) {
      nucleo[i] = 1;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
    }
  }
  if (bx1 <= bx0 || by1 <= by0) return null;
  const vecinos = [-w - 1, -w, -w + 1, -1, 0, 1, w - 1, w, w + 1];
  const borde = new Uint8Array(n);
  // Difuminado de 3x3 en dos pasadas (de lado y de alto): mucho más rápido en el celular
  fila.fill(0);
  for (let i = 1; i < n - 1; i++) fila[i] = nucleo[i - 1] + nucleo[i] + nucleo[i + 1];
  for (let i = 0; i < n; i++) {
    const s = i >= w && i < n - w ? fila[i - w] + fila[i] + fila[i + w] : 0;
    px[i * 4 + 3] = (s * 255) / 9;
    if (s > 0 && s < 9) borde[i] = 1;
  }
  // En el contorno, el color se toma de la prenda de más adentro (así no queda un hilo gris del fondo):
  // primero la orilla de la prenda y después el difuminado de afuera
  for (const adentro of [1, 0]) for (let i = 0; i < n; i++) {
    if (!borde[i] || nucleo[i] !== adentro) continue;
    let r = 0, v = 0, a = 0, cuantos = 0;
    for (const d of vecinos) {
      const j = i + d;
      if (!nucleo[j] || (adentro && borde[j])) continue;
      r += px[j * 4]; v += px[j * 4 + 1]; a += px[j * 4 + 2]; cuantos++;
    }
    if (cuantos) { px[i * 4] = r / cuantos; px[i * 4 + 1] = v / cuantos; px[i * 4 + 2] = a / cuantos; }
  }
  g.putImageData(datos, 0, 0);

  // 7) El gancho entra por lo más alto del cuello, al centro de la prenda
  const cx = Math.round((bx0 + bx1) / 2), r = Math.max(2, Math.round((bx1 - bx0) * 0.04));
  let arriba = by1;
  for (let x = cx - r; x <= cx + r; x++) for (let y = by0; y < arriba; y++) if (nucleo[y * w + x]) { arriba = y; break; }
  const m = 2, cw = bx1 - bx0 + 1 + m * 2, ch = by1 - by0 + 1 + m * 2;
  // Contorno de arriba (hombros) en 21 puntos de izquierda a derecha, para que la percha calce con la prenda
  const perfil = [];
  for (let k = 0; k <= 20; k++) {
    const x = Math.round(bx0 + ((bx1 - bx0) * k) / 20);
    let y = by0;
    while (y < by1 && !nucleo[y * w + x]) y++;
    perfil.push([x - bx0 + m, y - by0 + m]);
  }
  const lienzo = document.createElement("canvas");
  lienzo.width = cw;
  lienzo.height = ch;
  lienzo.getContext("2d").drawImage(c, bx0 - m, by0 - m, cw, ch, 0, 0, cw, ch);
  c.width = 0; // libera la memoria de la foto completa
  return { lienzo, gx: cx - bx0 + m, gy: arriba - by0 + m, perfil, fondo: F[1][1] };
}

// Mira si la foto trae su propia percha (como las de los prompts PERCHERO): arriba el gancho de metal, delgado, y
// bajo él la madera. Si trae gancho se le saca (la página dibuja uno recto hasta el riel, igual en todas las
// vistas) y la prenda se cuelga desde donde empieza la madera. esLado: es la foto de lado (esa siempre trae
// percha). Devuelve el mismo rec con percha: true o false.
function ajustarPercha(rec, esLado) {
  if (!rec) return null;
  const c = rec.lienzo, w = c.width, h = c.height;
  let px;
  try { px = c.getContext("2d").getImageData(0, 0, w, h).data; } catch { return { ...rec, percha: !!esLado }; }
  // Los tramos llenos de una fila: cuántos hay, el más ancho y su centro
  const fila = (y) => {
    let tramos = 0, mejor = 0, centro = 0, largo = 0;
    for (let x = 0, i = y * w * 4 + 3; x <= w; x++, i += 4) {
      if (x < w && px[i] >= 128) { if (!largo) tramos++; largo++; continue; }
      if (largo > mejor) { mejor = largo; centro = x - largo / 2; }
      largo = 0;
    }
    return { tramos, mejor, centro };
  };
  let y0 = 0;
  while (y0 < h - 1 && !fila(y0).mejor) y0++;
  // Un gancho mide unos 4 mm y la madera de canto más de 1 cm (en una prenda de unos 70 cm de largo)
  const alto = h - y0, fino = Math.max(2, alto * 0.012), firme = Math.max(3, Math.round(alto * 0.025));
  let tope = y0, unTramo = 0;
  for (let y = y0, seguidas = 0; y < y0 + alto * 0.35; y++) {
    const f = fila(y);
    if (f.mejor <= fino) { seguidas = 0; if (f.tramos === 1) unTramo++; continue; }
    if (++seguidas >= firme) { tope = y - firme + 1; break; }
  }
  // Gancho: un alambre solo (no las dos puntas de los hombros de una polera estirada)
  const gancho = tope - y0 > alto * 0.02 && unTramo > (tope - y0) * 0.6;
  // Sin gancho, la madera se reconoce porque arriba hay un solo tramo angosto y al centro (sin percha, una
  // polera arranca con los dos hombros y un polerón con la capucha, que es ancha)
  const bajo = fila(Math.min(h - 1, tope + Math.round(alto * 0.03)));
  const percha = !!esLado || gancho || (bajo.tramos === 1 && bajo.mejor < w * 0.14 && Math.abs(bajo.centro - w / 2) < w * 0.12);
  if (!percha) return { ...rec, percha: false };
  const gx = fila(Math.min(h - 1, tope + 1)).centro;
  if (!gancho) return { ...rec, gx, gy: tope, percha: true };
  // Se corta el gancho de la foto (desde 2 px sobre la madera)
  const corte = Math.max(0, tope - 2), lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h - corte;
  lienzo.getContext("2d").drawImage(c, 0, -corte);
  c.width = 0;
  return { ...rec, lienzo, gx, gy: tope - corte, perfil: rec.perfil.map(([x, y]) => [x, Math.max(0, y - corte)]), percha: true };
}

// Foto del panel para el perchero: el PNG sin fondo tal cual (o recortada, si no es PNG) con su percha medida
async function vistaPercha(src, anchoMax, esLado) {
  if (!src) return null;
  return ajustarPercha((await prendaSinFondo(src, anchoMax)) || (await recortarPrenda(src, anchoMax)), esLado);
}

function prepararPerchero() {
  const bloque = $("#perchero-bloque");
  if (!bloque) return;
  const caja = $("#perchero"), pista = $("#perchero-pista"), info = $("#perchero-info");
  // Solo las que la tienda marcó en el panel, en el orden de su lista. Si no marcó ninguna, no hay perchero.
  const cuelga = (p) => p.disponible && p.fotos.length && !PERCHERO_NO_CUELGAN.includes(p.categoria);
  const candidatos = PRODUCTOS.filter((p) => p.perchero && cuelga(p)).slice(0, PERCHERO_MAX);
  if (!candidatos.length) { bloque.remove(); return; }

  // Física de la ropa colgada (resorte con roce) y de las etiquetas (más livianas, se mecen más)
  const K = 52, C = 2.6, K_ET = 95, C_ET = 1.8;
  const RIEL_CERCA = 26; // al acercar una prenda el riel sube, como si la cámara se acercara
  let items = [], H = 240, S = 110, GANCHO = 24, RIEL = 64, altoRack = 560, relleno = 0, ancho = 0, escena = 0, escenaX = 0;
  let centro = -1, abierto = null, foco = null, deFrente = null, pendiente = null, metaScroll = 0, quieto = 0, scrollGiro = 0;
  let zoomP = 0, Z = 1, anim = 0, antes = 0, scrollAntes = 0, vel = 0;
  let empezo = false, listo = false, mostrado = false, girando = false;
  const suave = (t) => t * t * (3 - 2 * t);
  // Largo de la prenda colgada, de la madera a la basta: poleras y polerones igual, pantalones más largos
  const largoDe = (it) => H * (it.p.categoria === "Pantalones" ? 1.3 : it.p.categoria === "Shorts" ? 0.75 : 1);

  // Gancho de acero: una varilla recta que sube desde la madera y pasa por encima del riel (vista de canto, como
  // se ve un gancho de verdad en un perchero mirado de frente), con su casquillo donde entra a la madera.
  // El (0,0) es donde el gancho toca el riel · s: escala (crece con la prenda, como el de verdad)
  function ganchoAcero(yFin, s) {
    const w = Math.max(1.3, Math.min(3.4, 1.8 * s)), yTop = -3.5 - w;
    return `<g filter="url(#perchero-sombra-gancho)">
      <rect x="${-w / 2}" y="${yTop}" width="${w}" height="${yFin - yTop}" rx="${w / 2}" fill="url(#perchero-acero)"/>
      <rect x="${-w * 0.95}" y="${yFin - 2.6 * s}" width="${w * 1.9}" height="${3 * s}" rx="${0.6 * s}" fill="url(#perchero-acero)" stroke="#6f737a" stroke-width="${0.3 * s}"/>
    </g>`;
  }
  // Percha de nogal dibujada (cuando la foto no trae la suya): va DENTRO de la prenda, así que la tela la tapa
  // y solo asoma su cuello de madera sobre el cuello de la polera. En un polerón con capucha queda escondida.
  function perchaNogal(yC, alto, s, capucha) {
    if (capucha) return ganchoAcero(yC + 1.5 * s, s);
    const a = 5.2 * s, yT = yC - Math.max(8 * s, alto * 0.05), yB = yC + alto * 0.06;
    const cuello = `M${-a} ${yB} L${-a} ${yT + a} Q${-a} ${yT} 0 ${yT} Q${a} ${yT} ${a} ${yT + a} L${a} ${yB} Z`;
    return `${ganchoAcero(yT + 1.2 * s, s)}
      <g filter="url(#perchero-sombra)">
        <path d="${cuello}" fill="url(#perchero-nogal)" filter="url(#perchero-veta)"/>
        <path d="M${-a * 0.35} ${yT + a * 0.7} L${-a * 0.35} ${yB}" stroke="#e2b58a" stroke-width="${0.7 * s}" opacity=".35"/>
      </g>`;
  }
  // Pantalones y shorts sin foto en percha: percha de pinzas de nogal con el lobo grabado, tomada de la pretina
  function perchaPinzas(yP, anchoPrenda, s) {
    const mitad = anchoPrenda * 0.44, altoP = 7 * s, yB = yP - altoP * 0.55, logo = 8 * s;
    const pinza = (x) => `
      <rect x="${x - 3 * s}" y="${yB + altoP * 0.55}" width="${6 * s}" height="${10 * s}" rx="${1.2 * s}" fill="url(#perchero-acero)" stroke="#6f737a" stroke-width="${0.5 * s}"/>
      <rect x="${x - 3 * s}" y="${yB + altoP * 0.55 + 6.5 * s}" width="${6 * s}" height="${0.8 * s}" fill="#6f737a" opacity=".7"/>`;
    return `${ganchoAcero(yB + s, s)}
      <g filter="url(#perchero-sombra)">
        <rect x="${-mitad}" y="${yB}" width="${mitad * 2}" height="${altoP}" rx="${altoP / 2}" fill="url(#perchero-nogal-barra)" filter="url(#perchero-veta-h)"/>
        <rect x="${-mitad + altoP * 0.4}" y="${yB + altoP * 0.14}" width="${mitad * 2 - altoP * 0.8}" height="${altoP * 0.18}" rx="${altoP * 0.09}" fill="#e2b58a" opacity=".4"/>
      </g>
      ${pinza(-mitad * 0.72)}${pinza(mitad * 0.72)}
      <image href="img/logo-lobo-128.png" x="${-logo / 2}" y="${yB + altoP / 2 - logo / 2}" width="${logo}" height="${logo}" filter="url(#perchero-grabado)" opacity=".9"/>`;
  }
  // m: cómo quedó puesta la foto (escala e y dónde empieza)
  function pintarGancho(it, rec, m) {
    const capa = it.capa || 1, s = (H / 240) * capa, yC = m.arriba + rec.gy * m.e;
    // La percha va detrás de la prenda (dentro de ella); solo las pinzas toman la pretina por delante
    it.gancho.classList.toggle("delante", it.pinzas && !rec.percha);
    let dibujo;
    if (rec.percha) dibujo = ganchoAcero(yC + 1.5 * s, s);
    else if (it.pinzas) dibujo = perchaPinzas(yC, rec.lienzo.width * m.e, s);
    else {
      // Capucha: junto al cuello (a un cuarto del ancho) la prenda queda mucho más abajo que al centro
      const n = rec.perfil.length - 1, alto = rec.lienzo.height * m.e;
      const yHombros = m.arriba + ((rec.perfil[Math.round(n * 0.25)][1] + rec.perfil[Math.round(n * 0.75)][1]) / 2) * m.e;
      dibujo = perchaNogal(yC, alto, s, yHombros - yC > alto * 0.1);
    }
    it.gancho.innerHTML = `<svg width="1" height="1" overflow="visible" aria-hidden="true">${dibujo}</svg>`;
  }

  // Una polera o polerón estirado nunca es mucho más alto que ancho, y un pantalón no es tan largo como una
  // persona: si lo es, la foto era de alguien puesto la prenda
  const esPrenda = (rec, p) => !!rec && rec.lienzo.height / rec.lienzo.width <= (PERCHERO_PINZAS.includes(p.categoria) ? 3.1 : 1.45);

  // cual: de dónde salió la foto de frente (-1: PNG de frente del panel, -2: solo hay PNG de lado, 0 o más: el
  // número de foto del producto que se recortó) · lado: la foto de lado (o null si no hay)
  function crearItem(p, rec, cual, lado) {
    const el = document.createElement("button");
    el.className = "colgado";
    el.setAttribute("aria-label", `Ver ${p.nombre}`);
    el.innerHTML = `<span class="colgado-mueve"><span class="colgado-llega"><span class="gancho"></span><span class="prenda p-lado"></span><span class="prenda p-frente"></span></span></span>`;
    const q = (s) => el.querySelector(s);
    // Cada prenda pesa y cuelga un poco distinto: así no se mecen todas iguales, como robots
    return { p, el, mover: el.firstElementChild, llega: q(".colgado-llega"), gancho: q(".gancho"), vLado: q(".p-lado"), vFrente: q(".p-frente"),
      cual, pinzas: PERCHERO_PINZAS.includes(p.categoria), frente: rec, recLado: lado, alta: null, altaP: null, espalda: undefined, actual: rec,
      giro: lado ? 0 : 1, giroPintado: -1, corre: 0, aparta: 0, mF: null, mL: null, vistaGancho: null, i: 0, th: 0, w: 0,
      etiquetas: null, grupoEt: null, escalaEt: "",
      k: K * (0.8 + Math.random() * 0.4), c: C * (0.85 + Math.random() * 0.3), masa: 0.85 + Math.random() * 0.3 };
  }

  // Tamaño de la foto: con percha propia, todas del mismo largo (de la madera a la basta), así la de lado, la de
  // frente y la de espalda calzan. Sin percha (prenda estirada), todas del mismo ancho; pantalones más angostos.
  // capa: tamaño al que se dibuja (1 en el riel; al terminar de acercarse se dibuja de verdad en grande,
  // porque agrandar con zoom una imagen chica se ve borrosa en el celular)
  function escalaDe(it, rec) {
    const capa = it.capa || 1;
    if (rec.percha) return (largoDe(it) * capa) / Math.max(1, rec.lienzo.height - rec.gy);
    const g = H * 0.56 * capa, objetivo = g * (it.pinzas ? 0.62 : 1), largoMax = g * (it.pinzas ? 1.9 : 1.3);
    return Math.min(objetivo / rec.lienzo.width, largoMax / rec.lienzo.height);
  }
  // Pone una foto con la madera (o el cuello, o la pretina) justo donde llega el gancho
  function ponerVista(it, hueco, rec) {
    const capa = it.capa || 1, e = escalaDe(it, rec), arriba = GANCHO * capa - rec.gy * e + 1, s = hueco.style;
    s.left = -rec.gx * e + "px";
    s.top = arriba + "px";
    s.width = rec.lienzo.width * e + "px";
    s.height = rec.lienzo.height * e + "px";
    s.transformOrigin = `${rec.gx * e}px 0`;
    if (rec.lienzo.parentNode !== hueco) hueco.replaceChildren(rec.lienzo);
    return { e, arriba, ancho: (rec.lienzo.width * e) / capa, alto: (rec.lienzo.height * e) / capa, izq: (rec.gx * e) / capa };
  }
  function ponerLienzo(it, rec) {
    it.actual = rec;
    it.mF = ponerVista(it, it.vFrente, rec);
    if (it.recLado) it.mL = ponerVista(it, it.vLado, it.recLado);
    it.vistaGancho = null;
    pintarVistaGancho(it);
    colocarEtiquetas(it);
  }
  // El gancho sigue a la foto que se está viendo (de lado o de frente)
  function pintarVistaGancho(it) {
    const deLado = it.recLado && it.giro < 0.45, rec = deLado ? it.recLado : it.actual;
    if (it.vistaGancho === rec) return;
    it.vistaGancho = rec;
    pintarGancho(it, rec, deLado ? it.mL : it.mF);
  }

  // Cambia el tamaño al que se dibuja la prenda (sin que se note: la escala de la animación lo compensa)
  function cambiarCapa(it, capa) {
    if ((it.capa || 1) === capa) return;
    it.capa = capa;
    ponerLienzo(it, it.actual);
  }

  // Toma de lejos, como una foto de estudio: en el ancho de la "foto" caben unas 4 prendas de lado, grandes,
  // con pared arriba y la sombra en el piso. En el computador la foto queda al centro.
  function medidas() {
    ancho = caja.clientWidth;
    escena = Math.min(ancho, 920);
    H = Math.round(Math.min(escena * 0.6, 420));
    S = H * 0.46;
    GANCHO = Math.round(H * 0.1);
    for (const it of items) ponerLienzo(it, it.actual);
    // El alto sale de la prenda más larga: riel, prendas, la sombra en el piso y el texto de abajo
    const largo = Math.max(H, ...items.map((it) => Math.max(it.mF.alto, it.mL ? it.mL.alto : 0)));
    RIEL = Math.round(Math.max(72, escena * 0.13));
    const suelo = Math.round(RIEL + GANCHO + largo + Math.max(22, H * 0.08));
    altoRack = suelo + 76;
    const total = items.length * S;
    // Las prendas se ven solo dentro de la "foto" (en el computador queda al centro y el riel sigue de lado
    // a lado). Si caben todas, quedan centradas; si son más, parten desde el borde y se deslizan.
    escenaX = (ancho - escena) / 2;
    relleno = total <= escena ? (escena - total) / 2 : S * 0.1;
    caja.classList.toggle("desborda", total > escena);
    caja.style.setProperty("--escena-x", escenaX + "px");
    caja.style.setProperty("--slot", S + "px");
    caja.style.setProperty("--relleno", relleno + "px");
    caja.style.setProperty("--suelo", suelo + "px");
    caja.style.setProperty("--flecha-y", RIEL + GANCHO + H * 0.45 + "px");
    if (deFrente) medirGiro(deFrente);
    if (!abierto) {
      caja.style.height = altoRack + "px";
      caja.style.setProperty("--riel", RIEL + "px");
    }
  }

  // Cuánto se corre cada prenda: las de al lado de la que está de frente le hacen espacio (y si quedó pegada
  // a un borde, se corre todo el perchero para que se vea entera)
  function corrimiento(i) {
    let d = 0;
    for (const j of items) {
      if (!j.recLado || !j.giro) continue;
      d += (j.corre + (i < j.i ? -j.aparta : i > j.i ? j.aparta : 0)) * suave(Math.min(1, j.giro * 1.5));
    }
    return d;
  }
  function medirGiro(it) {
    const m = it.mF, x = escenaX + relleno + it.i * S + S / 2 - pista.scrollLeft;
    const izq = m.izq + 10, der = m.ancho - m.izq + 10;
    it.corre = x - izq < escenaX ? escenaX + izq - x : x + der > escenaX + escena ? escenaX + escena - der - x : 0;
    it.aparta = Math.max(0, m.ancho / 2 + H * 0.1 - (S - (it.mL ? it.mL.ancho : S) / 2));
  }
  // Darse vuelta, como en el video: la foto de lado se angosta (está girando) y se abre la de frente
  function pintarGiro(it) {
    if (it.giroPintado === it.giro) return;
    it.giroPintado = it.giro;
    const a = Math.min(1, it.giro / 0.45), b = Math.max(0, (it.giro - 0.4) / 0.6), L = it.vLado.style, F = it.vFrente.style;
    L.transform = `scaleX(${(1 - 0.94 * a * a).toFixed(3)})`;
    L.visibility = a < 1 ? "visible" : "hidden";
    F.transform = b < 1 ? `scaleX(${(0.2 + 0.8 * (1 - (1 - b) * (1 - b))).toFixed(3)})` : "";
    F.opacity = Math.min(1, b * 2.5).toFixed(2);
    F.visibility = b > 0 ? "visible" : "hidden";
    pintarVistaGancho(it);
  }

  // Todas cuelgan en su lugar del riel. La elegida corre por el riel hasta el centro, se da vuelta y, al
  // tocarla otra vez, se acerca hasta quedar grande (y al cerrar vuelve a su lugar haciendo el camino al revés).
  function pintar() {
    const c = Math.max(0, Math.min(items.length - 1, Math.round((pista.scrollLeft + escena / 2 - relleno - S / 2) / S)));
    const p = suave(zoomP);
    for (const it of items) {
      let tx = corrimiento(it.i), sc = 1;
      if (foco === it) {
        tx += (ancho / 2 - (escenaX + relleno + it.i * S + S / 2 - pista.scrollLeft + tx)) * p;
        sc = (1 + (Z - 1) * p) / (it.capa || 1);
      }
      it.mover.style.transform = `translateX(${tx.toFixed(1)}px) rotateZ(${it.th.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      it.el.style.zIndex = foco === it ? 200 : it.recLado && it.giro > 0 ? 150 : 100;
      if (it.recLado) pintarGiro(it);
      escalarEtiqueta(it, p);
    }
    return c;
  }

  function cuadro(t) {
    anim = 0;
    const dt = Math.min(0.04, Math.max(0.001, (t - antes) / 1000));
    antes = t;
    const sl = pista.scrollLeft, v = (sl - scrollAntes) / dt;
    scrollAntes = sl;
    const nueva = vel * 0.6 + v * 0.4, acel = (nueva - vel) / dt;
    vel = nueva;
    // Si el riel acelera hacia un lado, la ropa se queda atrás y después vuelve, como en la tienda
    const empuje = sinMovimiento ? 0 : Math.max(-900, Math.min(900, -0.06 * acel));
    let sigue = Math.abs(v) > 2;
    for (const it of items) {
      if (sinMovimiento) { it.th = it.w = 0; continue; }
      const alfa = -it.k * it.th - it.c * it.w + empuje * it.masa;
      it.w += alfa * dt;
      it.th = Math.max(-20, Math.min(20, it.th + it.w * dt));
      if (Math.abs(it.th) > 0.04 || Math.abs(it.w) > 0.4) sigue = true;
      if (!it.etiquetas) continue;
      for (const et of it.etiquetas) {
        // La etiqueta busca su posición de reposo aunque la prenda esté inclinada
        const b = -K_ET * (et.th + it.th - et.reposo) - C_ET * et.w - alfa * 0.6;
        et.w += b * dt;
        et.th += et.w * dt;
        et.el.style.transform = `rotate(${et.th.toFixed(2)}deg)`;
        if (Math.abs(et.th + it.th - et.reposo) > 0.05 || Math.abs(et.w) > 0.5) sigue = true;
      }
    }
    // La que se da vuelta de frente (o vuelve a quedar de lado)
    for (const it of items) {
      if (!it.recLado) continue;
      const meta = it === deFrente ? 1 : 0;
      if (it.giro === meta) continue;
      it.giro = sinMovimiento ? meta : meta ? Math.min(1, it.giro + dt / 0.55) : Math.max(0, it.giro - dt / 0.45);
      sigue = true;
    }
    // La prenda tocada se da vuelta cuando llega al centro del riel (o cuando el riel ya no puede correr más)
    if (pendiente) {
      quieto = Math.abs(v) < 6 ? quieto + dt : 0;
      if (Math.abs(sl - metaScroll) < 2 || quieto > 0.18) darVuelta(pendiente);
      sigue = true;
    } else if (deFrente && !abierto && Math.abs(sl - scrollGiro) > S * 0.45) soltarFrente();
    const meta = abierto ? 1 : 0;
    if (zoomP !== meta) {
      zoomP = sinMovimiento ? meta : zoomP + (meta - zoomP) * (1 - Math.exp(-dt * 5));
      if (Math.abs(zoomP - meta) < 0.002) zoomP = meta;
      sigue = true;
    }
    // Ya acercada: se dibuja de verdad en grande (nítida). Ya de vuelta en el riel: otra vez a su tamaño.
    if (abierto && zoomP === 1) cambiarCapa(abierto, Z);
    if (!abierto && zoomP === 0 && foco) {
      cambiarCapa(foco, 1);
      foco.el.classList.remove("elegido");
      foco = null;
    }
    const c = pintar();
    if (c !== centro) cambiarCentro(c);
    if (sigue) anim = requestAnimationFrame(cuadro);
  }
  const arrancar = () => {
    if (anim || !listo) return;
    antes = performance.now();
    anim = requestAnimationFrame(cuadro);
  };

  function pintarInfo() {
    const clic = matchMedia("(hover: hover)").matches;
    if (deFrente) {
      info.innerHTML = `<p class="pi-nombre">${esc(deFrente.p.nombre)}</p><p class="precio pi-precio">${precioHtml(deFrente.p)}</p>
        <p class="pi-pista">${clic ? "Haz clic en" : "Toca"} la prenda otra vez para verla de cerca</p>`;
      return;
    }
    const deLado = items.some((it) => it.recLado);
    info.innerHTML = `<p class="pi-pista">${clic ? "Haz clic en" : "Toca"} una prenda para verla ${deLado ? "de frente" : "de cerca"} 👆</p>`;
  }
  // Al deslizar el perchero, cada prenda que pasa hace tintinear su gancho
  function cambiarCentro(c) {
    const habia = centro;
    centro = c;
    if (habia >= 0 && mostrado && !abierto) sonidoGancho(0.8);
  }

  // La etiqueta de cartón con las tallas cuelga del gancho, delante de la prenda, y se mece con ella
  const tamEtiqueta = () => Math.max(0.7, Math.min(1.05, H / 300));
  function colocarEtiquetas(it) {
    if (!it.grupoEt) return;
    it.grupoEt.style.top = (GANCHO * (it.capa || 1) * 0.42).toFixed(1) + "px";
    it.escalaEt = "";
  }
  // En pantalla se ve chica en el riel y un poco más grande con la prenda acercada
  function escalarEtiqueta(it, p) {
    if (!it.grupoEt) return;
    const pf = foco === it ? p : 0, base = tamEtiqueta(), pantalla = base + (1.3 - base) * pf;
    const t = `scale(${((pantalla * (it.capa || 1)) / (1 + (Z - 1) * pf)).toFixed(3)})`;
    if (t === it.escalaEt) return;
    it.grupoEt.style.transform = t;
    it.escalaEt = t;
  }
  function colgarEtiquetas(it) {
    const tallas = it.p.tallas.filter((t) => t.toLowerCase() !== "única");
    if (!tallas.length) return;
    const grupo = document.createElement("span");
    grupo.className = "etiquetas visible";
    grupo.innerHTML = `<span class="etiqueta kraft"><i></i><span class="carton"><small>Tallas</small><b>${tallas.map(esc).join(" ")}</b></span></span>`;
    it.llega.append(grupo);
    it.grupoEt = grupo;
    colocarEtiquetas(it);
    escalarEtiqueta(it, 0);
    // Queda un poco ladeada (reposo, en grados), como la del video
    it.etiquetas = [...grupo.querySelectorAll(".etiqueta")].map((el) => ({ el, th: -12, w: 0, reposo: -12 }));
  }

  // La foto de frente en alta (para verla de cerca): el PNG del panel, o la foto del producto recortada en alta
  function cargarAlta(it) {
    if (!it.altaP) {
      it.altaP = (it.cual < 0
        ? vistaPercha(it.cual === -1 ? it.p.fotoPerchero : it.p.fotoPercheroLado, 1600, it.cual === -2)
        : recortarPrenda(it.p.fotos[it.cual], 1200).then((r) => ajustarPercha(r, false))
      ).then((r) => (it.alta = r));
    }
    return it.altaP;
  }
  // Ya de vuelta en el riel (y de lado), se suelta lo que se cargó en alta para no gastar memoria del teléfono
  function liberar(it) {
    if (abierto === it || foco === it) return;
    if (it.actual !== it.frente) ponerLienzo(it, it.frente);
    if (deFrente === it || pendiente === it) return;
    for (const r of [it.alta, it.espalda]) if (r) r.lienzo.width = 0;
    it.alta = it.altaP = null;
    it.espalda = undefined;
  }

  // Tocar una prenda de lado: corre por el riel hasta el centro y ahí se da vuelta
  function llamar(it) {
    if (!listo) return;
    soltarFrente(true);
    pendiente = it;
    quieto = 0;
    metaScroll = Math.max(0, Math.min(pista.scrollWidth - pista.clientWidth, relleno + it.i * S + S / 2 - pista.clientWidth / 2));
    if (Math.abs(pista.scrollLeft - metaScroll) > 2) pista.scrollTo({ left: metaScroll, behavior: sinMovimiento ? "auto" : "smooth" });
    arrancar();
  }
  function darVuelta(it) {
    pendiente = null;
    deFrente = it;
    scrollGiro = pista.scrollLeft;
    medirGiro(it);
    sonidoTela(0.45);
    it.w += 30;
    pintarInfo();
    arrancar();
    // Se deja lista la foto de frente en alta, para que al acercarla se vea nítida al tiro
    cargarAlta(it);
  }
  function soltarFrente(callado) {
    pendiente = null;
    const it = deFrente;
    if (!it) return;
    deFrente = null;
    if (!callado) pintarInfo();
    arrancar();
    setTimeout(() => liberar(it), 1500);
  }

  // Lo que tapan arriba la barra y la fila de categorías (las dos quedan pegadas al bajar)
  const tapado = () => $(".barra").offsetHeight + ($(".categorias") ? $(".categorias").offsetHeight : 0);
  // Al acercar, el panel ocupa justo la pantalla (bajo las barras de arriba)
  const altoZoom = () => Math.round(Math.max(420, innerHeight - tapado()));

  async function abrir(it) {
    if (abierto || !listo) return;
    pendiente = null;
    if (foco && foco !== it) { cambiarCapa(foco, 1); foco.el.classList.remove("elegido"); zoomP = 0; }
    cambiarCapa(it, 1);
    abierto = foco = it;
    sonidoTela();
    const alto = altoZoom(), m = it.mF;
    caja.style.height = alto + "px";
    // Grande como las fotos del catálogo: casi todo el ancho, sin tapar el nombre y los botones de abajo
    Z = Math.max(1.2, Math.min((escena * 0.84) / m.ancho, (alto - RIEL_CERCA - 205) / (GANCHO + m.alto)));
    // Si sobra alto, el riel baja un poco para que la prenda quede al medio entre arriba y el nombre
    const sobra = alto - RIEL_CERCA - 205 - (GANCHO + m.alto) * Z;
    caja.style.setProperty("--riel", Math.round(RIEL_CERCA + Math.max(0, sobra) * 0.5) + "px");
    caja.classList.add("abierto");
    it.el.classList.add("elegido");
    // De cerca, la etiqueta queda apoyada en el hombro para no tapar el cuello ni el diseño
    if (it.etiquetas) for (const et of it.etiquetas) et.reposo = -32;
    info.innerHTML = `<p class="pi-nombre">${esc(it.p.nombre)}</p><p class="precio pi-precio">${precioHtml(it.p)}</p>
      <div class="pi-lados" role="group" aria-label="Lado de la prenda" hidden>
        <button data-lado="frente" aria-pressed="true">Frente</button><button data-lado="espalda" aria-pressed="false">Espalda</button>
      </div>
      <button class="ed-btn pi-comprar" data-comprar>Elegir talla y comprar</button>`;
    it.w += 50;
    arrancar();
    window.scrollTo({ top: caja.getBoundingClientRect().top + scrollY - tapado(), behavior: sinMovimiento ? "auto" : "smooth" });
    // Cuando termina de acercarse: la foto en alta y la espalda
    await new Promise((ok) => setTimeout(ok, 700));
    if (abierto !== it) return;
    await cargarAlta(it);
    if (abierto !== it) return;
    if (it.alta && it.actual === it.frente) ponerLienzo(it, it.alta);
    if (it.espalda === undefined) {
      const base = it.alta || it.frente, prop = (x) => x.lienzo.height / x.lienzo.width;
      it.espalda = it.p.fotoPercheroEspalda ? await vistaPercha(it.p.fotoPercheroEspalda, 1600, false) : null;
      if (abierto !== it) return;
      // Sin PNG de espalda (y si la prenda no cuelga con fotos en percha): la siguiente foto del producto que
      // sea la prenda sola y de la misma forma
      for (let f = 0; f < it.p.fotos.length && !it.espalda && !it.recLado; f++) {
        if (f === it.cual) continue;
        const rec = ajustarPercha(await recortarPrenda(it.p.fotos[f], 1200), false);
        if (abierto !== it) return;
        if (esPrenda(rec, it.p) && Math.abs(prop(rec) - prop(base)) < prop(base) * 0.25) it.espalda = rec;
      }
    }
    if (abierto !== it) return;
    const lados = $(".pi-lados", info);
    if (lados && it.espalda) lados.hidden = false;
  }

  function cerrar() {
    const it = abierto;
    if (!it) return;
    abierto = null;
    caja.classList.remove("abierto");
    caja.style.height = altoRack + "px";
    caja.style.setProperty("--riel", RIEL + "px");
    if (it.etiquetas) for (const et of it.etiquetas) et.reposo = -12;
    it.w -= 50;
    sonidoGancho(0.7);
    scrollGiro = pista.scrollLeft;
    pintarInfo();
    arrancar();
    setTimeout(() => liberar(it), 1500);
  }

  // Frente / Espalda: la prenda se da vuelta en la percha, como en el riel: se angosta, cambia de foto y se
  // vuelve a abrir (las dos fotos en alta, así no pierde calidad)
  async function girar(aEspalda) {
    const it = abierto;
    if (!it || girando) return;
    const rec = aEspalda ? it.espalda : it.alta || it.frente;
    if (!rec || rec === it.actual) return;
    girando = true;
    sonidoTela(0.5);
    const v = it.vFrente;
    const ida = sinMovimiento ? null : v.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(.05)" }], { duration: 210, easing: "cubic-bezier(.55,0,.9,.5)", fill: "forwards" });
    if (ida) await ida.finished.catch(() => {});
    ponerLienzo(it, rec);
    info.querySelectorAll("[data-lado]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.lado === "espalda") === aEspalda)));
    const vuelta = sinMovimiento ? null : v.animate([{ transform: "scaleX(.2)", opacity: 0.4 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 330, easing: "cubic-bezier(.2,.8,.3,1)" });
    if (ida) ida.cancel();
    if (vuelta) await vuelta.finished.catch(() => {});
    it.w += aEspalda ? 30 : -30;
    arrancar();
    girando = false;
  }

  // Al llegar a la sección, la ropa se va colgando de a una con su tintineo
  function entrada() {
    if (mostrado || !listo) return;
    mostrado = true;
    caja.classList.remove("esperando");
    if (sinMovimiento) return;
    items.forEach((it, i) => {
      const espera = i * 85;
      it.llega.animate([
        { transform: "translateY(-46px)", opacity: 0 },
        { transform: "translateY(4px)", opacity: 1, offset: 0.7 },
        { transform: "translateY(0)", opacity: 1 },
      ], { duration: 520, delay: espera, easing: "cubic-bezier(.3,.6,.4,1)", fill: "backwards" });
      setTimeout(() => {
        it.w += (i % 2 ? 1 : -1) * (60 + Math.random() * 40);
        if (Math.abs(i - centro) <= 2) sonidoGancho(0.45);
        arrancar();
      }, espera + 360);
    });
  }

  async function colgarTodo() {
    if (empezo) return;
    empezo = true;
    const fondos = [];
    // Las fotos 1 se descargan todas a la vez y se recortan de a una (deja respirar a la página entre foto y foto)
    const cargas = candidatos.map((p) => (p.fotoPerchero || p.fotoPercheroLado ? null : cargarImagen(p.fotos[0]).catch(() => null)));
    for (const [k, p] of candidatos.entries()) {
      // Las fotos del panel para el perchero (PNG sin fondo en su percha): de lado y de frente
      let lado = p.fotoPercheroLado ? await vistaPercha(p.fotoPercheroLado, 900, true) : null;
      let frente = p.fotoPerchero ? await vistaPercha(p.fotoPerchero, lado ? 800 : 640, false) : null, cual = -1;
      await new Promise((ok) => setTimeout(ok));
      if (!frente && lado) { frente = lado; lado = null; cual = -2; }
      if (frente) {
        items.push(crearItem(p, frente, cual, lado));
        if (frente.fondo) fondos.push(frente.fondo);
        continue;
      }
      // Sin fotos del panel: se recorta la foto de la prenda sola (si la 1 es con modelo, se prueba con las demás)
      for (let f = 0; f < p.fotos.length; f++) {
        const rec = ajustarPercha(await recortarPrenda(f ? p.fotos[f] : cargas[k] || p.fotos[0], 640), false);
        await new Promise((ok) => setTimeout(ok));
        if (!esPrenda(rec, p)) continue;
        items.push(crearItem(p, rec, f, null));
        fondos.push(rec.fondo);
        break;
      }
    }
    if (!items.length) { bloque.remove(); return; }
    items.forEach((it, i) => (it.i = i));
    // La pared toma el mismo gris de las fotos recortadas: así cualquier borde del recorte queda invisible
    if (fondos.length) {
      const pared = [0, 1, 2].map((k) => Math.round(fondos.reduce((s, f) => s + f[k], 0) / fondos.length));
      caja.style.setProperty("--pared", `rgb(${pared.join(",")})`);
    }
    pista.replaceChildren(...items.map((it) => it.el));
    caja.classList.remove("cargando");
    medidas();
    for (const it of items) colgarEtiquetas(it);
    listo = true;
    pista.scrollLeft = 0;
    scrollAntes = 0;
    pintarInfo();
    cambiarCentro(pintar());
    const r = caja.getBoundingClientRect();
    if (r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3) entrada();
  }

  pista.addEventListener("scroll", arrancar, { passive: true });
  pista.addEventListener("click", (e) => {
    const el = e.target.closest(".colgado");
    if (abierto) {
      if (e.target.closest(".etiquetas")) return;
      // Tocar la prenda la gira; tocar fuera la devuelve al riel
      if (el === abierto.el && e.target.closest(".prenda")) { if (abierto.espalda) girar(abierto.actual !== abierto.espalda); }
      else cerrar();
      return;
    }
    const it = el && items.find((x) => x.el === el);
    if (!it) { soltarFrente(); return; }
    // De lado: corre al centro y se da vuelta. De frente: se acerca.
    if (!it.recLado) abrir(it);
    else if (it !== deFrente) llamar(it);
    else if (it.giro > 0.6) abrir(it);
  });
  // Con el teclado (Tab), la prenda elegida se asoma si estaba fuera de la vista
  pista.addEventListener("focusin", (e) => {
    if (!abierto && e.target.matches(".colgado:focus-visible")) e.target.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  });
  // Con mouse, pasar por encima mece la ropa, como pasar la mano por el perchero
  pista.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || abierto || sinMovimiento || !listo) return;
    const el = e.target.closest(".colgado"), it = el && items.find((x) => x.el === el);
    if (!it) return;
    it.w = Math.max(-140, Math.min(140, it.w - e.movementX * 2.2));
    arrancar();
  });
  caja.addEventListener("click", (e) => {
    const b = e.target.closest("[data-correr]");
    if (b) pista.scrollBy({ left: Number(b.dataset.correr) * S, behavior: "smooth" });
  });
  $("#perchero-cerrar").addEventListener("click", cerrar);
  info.addEventListener("click", (e) => {
    const lado = e.target.closest("[data-lado]");
    if (lado) { girar(lado.dataset.lado === "espalda"); return; }
    if (e.target.closest("[data-comprar]") && abierto) {
      const id = abierto.p.id;
      cerrar();
      location.hash = "producto=" + encodeURIComponent(id);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$("#modal").hidden) return;
    if (abierto) cerrar();
    else soltarFrente();
  });

  new ResizeObserver(() => {
    if (!listo || caja.clientWidth === ancho) return;
    medidas();
    pintar();
  }).observe(caja);
  // Se prepara un poco antes de llegar; al verse, la ropa se cuelga. Si se sale de la sección, todo vuelve al riel.
  new IntersectionObserver(([e]) => { if (e.isIntersecting) colgarTodo(); }, { rootMargin: "1200px 0px" }).observe(bloque);
  new IntersectionObserver(([e]) => {
    caja.classList.toggle("fuera", !e.isIntersecting);
    if (!e.isIntersecting) { cerrar(); soltarFrente(); }
    if (e.intersectionRatio >= 0.3) entrada();
  }, { threshold: [0, 0.3] }).observe(caja);
}

// ---------- La vitrina que gira (Accesorios) ----------
// Los accesorios (gorras, relojes, cinturones, calcetines…) flotan en un círculo que gira lento, como una vitrina
// giratoria mirada un poco desde arriba: el de adelante se ve grande y los de atrás más chicos y más arriba.
// Se gira con el dedo (o el mouse) y siempre queda uno al frente; tocar uno de atrás lo trae adelante y tocar el
// de adelante lo acerca grande, con su nombre, precio y colores (como en el video de referencia).
// En el panel, cada producto tiene la casilla "Girar en la vitrina de Accesorios": salen solo los marcados (en el
// orden de la lista) con su foto PNG sin fondo de Canva. Sin PNG se intenta recortar sola su foto (fondo claro y
// liso); si no se puede, ese no sale. Si no hay ninguno marcado, la sección no aparece.
const VITRINA_CATEGORIA = "Accesorios";
const VITRINA_MAX = 12;
const vitrinaProductos = () =>
  PRODUCTOS.filter((p) => p.vitrina && p.disponible && (p.fotoVitrina || p.fotos.length)).slice(0, VITRINA_MAX);

// Colores escritos en el panel → color del puntito (si no se conoce, se muestra solo el nombre)
const COLORES_CSS = {
  negro: "#151515", blanco: "#f6f5f1", gris: "#8b8b8d", plomo: "#6c6f73", grafito: "#3c3d40", beige: "#d9c8a9",
  crema: "#efe5cf", hueso: "#ece6d6", arena: "#cdb895", cafe: "#6b4a30", marron: "#6b4a30", chocolate: "#4a2f1e",
  camel: "#b4874f", azul: "#25407a", marino: "#1c2a46", celeste: "#9fc8ea", rojo: "#b5242c", burdeo: "#6a1a28",
  vino: "#5c1725", verde: "#3d6b3c", oliva: "#6b6a3a", militar: "#545a3a", menta: "#a8d8c0", amarillo: "#fad02c",
  mostaza: "#c99a2e", naranjo: "#e3762c", naranja: "#e3762c", rosado: "#f0b4c4", rosa: "#f0b4c4", fucsia: "#d6307a",
  morado: "#5d3a7d", lila: "#b9a2d6", dorado: "#c9a54a", oro: "#c9a54a", plateado: "#c3c7cc", plata: "#c3c7cc",
  acero: "#9aa0a6", cobre: "#b06b3c", bronce: "#8c6239",
};
// "Azul marino" → marino · "Negro mate" → negro (manda la última palabra conocida)
function colorCss(nombre) {
  const n = String(nombre).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const palabra of n.split(/[^a-z]+/).reverse()) if (COLORES_CSS[palabra]) return COLORES_CSS[palabra];
  return null;
}

function vitrinaHtml() {
  const verTodo = PRODUCTOS.some((p) => p.categoria === VITRINA_CATEGORIA);
  return `<section class="ed-bloque vitrina-bloque" id="vitrina-bloque">
    <div class="ed-cab"><h2>${esc(VITRINA_CATEGORIA)}</h2></div>
    <div class="vitrina cargando" id="vitrina">
      <p class="vitrina-palabra" id="vitrina-palabra" aria-hidden="true"></p>
      <div class="vitrina-piso" aria-hidden="true"></div>
      <div class="vitrina-sombras" id="vitrina-sombras" aria-hidden="true"></div>
      <div class="vitrina-escena" id="vitrina-escena" role="group" aria-label="Accesorios en la vitrina"></div>
      <button class="flecha izq" data-girar="1" aria-label="Traer el accesorio de la izquierda">‹</button>
      <button class="flecha der" data-girar="-1" aria-label="Traer el accesorio de la derecha">›</button>
      <div class="vitrina-pie">
        <p class="vitrina-cuenta"><b id="vitrina-num">01</b><small id="vitrina-total"></small><span id="vitrina-nombre"></span></p>
        <div class="vitrina-puntos" id="vitrina-puntos" role="group" aria-label="Elegir accesorio"></div>
        <p class="vitrina-pista" id="vitrina-pista">Armando la vitrina…</p>
      </div>
      <div class="vitrina-ficha" id="vitrina-ficha" aria-live="polite"></div>
      <button class="vitrina-cerrar" id="vitrina-cerrar" aria-label="Volver a la vitrina">×</button>
    </div>
    ${verTodo ? `<a class="ed-btn ed-btn-solo" href="#catalogo" data-ver-cat="${esc(VITRINA_CATEGORIA)}">Ver todo</a>` : ""}
  </section>`;
}

// Mapa chico de lo que es accesorio y lo que es aire en cada foto: así un toque en el hueco de unos lentes o
// de una cadena le llega al de atrás, como pasaría de verdad
function mapaAlfa(lienzo) {
  const w = 48, h = Math.max(1, Math.round((48 * lienzo.height) / lienzo.width));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(lienzo, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
  c.width = 0;
  return { w, h, a };
}

function prepararVitrina() {
  const bloque = $("#vitrina-bloque");
  if (!bloque) return;
  const caja = $("#vitrina"), escena = $("#vitrina-escena"), sombras = $("#vitrina-sombras"), ficha = $("#vitrina-ficha");
  const palabra = $("#vitrina-palabra"), puntos = $("#vitrina-puntos"), pista = $("#vitrina-pista");
  const candidatos = vitrinaProductos();
  if (!candidatos.length) { bloque.remove(); return; }

  const AUTO = 0.32;        // accesorios por segundo cuando gira sola (uno nuevo adelante cada ~3 s, como en el video)
  const ESPERA_AUTO = 3500; // después de moverla con el dedo, vuelve a girar sola a los 3,5 s
  let items = [], N = 0;
  // pos: qué accesorio está adelante (con decimales mientras gira: 2,5 = entre el 2 y el 3)
  // modo: "auto" (gira sola) · "arrastre" (con el dedo) · "inercia" (sigue sola al soltar) · "meta" (va a uno) · "quieto"
  let pos = 0, vel = 0, meta = 0, modo = "quieto", adelante = -1, quietoDesde = 0;
  let W = 0, H = 0, B = 0, RX = 0, PROF = 0, PISO = 0, movil = false;
  let anim = 0, antes = 0, reloj = 0, entradaT = null, listo = false, empezo = false, visible = false, mostrado = false;
  let arrastre = null, rueda = 0, abierto = null, foco = null, zoomP = 0;
  const suave = (t) => t * t * (3 - 2 * t);
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const pxPorItem = () => (RX * Math.PI * 2) / Math.max(1, N);
  // Distancia más corta (en accesorios, con signo) desde lo que se ve adelante hasta el accesorio i
  const distancia = (i) => { let d = (((i - pos) % N) + N) % N; if (d > N / 2) d -= N; return d; };
  const clic = () => matchMedia("(hover: hover)").matches;
  // Lo que tapan arriba la barra y la fila de categorías (las dos quedan pegadas al bajar)
  const tapado = () => $(".barra").offsetHeight + ($(".categorias") ? $(".categorias").offsetHeight : 0);

  // Escenario: en el celular más alto que ancho; el de adelante ocupa casi la mitad del ancho
  function medidas() {
    W = caja.clientWidth;
    movil = W < 700;
    H = Math.round(movil ? limitar(W * 1.25, 460, 600) : limitar(W * 0.5, 520, 640));
    caja.style.height = H + "px";
    B = movil ? W * 0.5 : Math.min(W * 0.25, 320);
    // Bien juntos, montados unos sobre otros como en el video; con muchos accesorios el círculo se abre un poco
    RX = B * (movil ? 0.58 : 0.8) * (1 + Math.max(0, N - 6) * 0.05);
    // Mirada un poco desde arriba: los de atrás quedan bastante más arriba que el de adelante
    PROF = H * 0.25;
    PISO = H * (movil ? 0.7 : 0.74);
    caja.style.setProperty("--piso-y", (PISO - PROF * 0.5).toFixed(0) + "px");
    caja.style.setProperty("--piso-w", (RX * 2 + B * 1.3).toFixed(0) + "px");
    for (const it of items) dimensionar(it);
  }
  // Todos se ven de un tamaño parecido (un reloj chico y un cinturón largo pesan lo mismo a la vista). La caja
  // de cada uno mide lo que mide acercado: en la vitrina se achica, así al acercarlo se ve nítido.
  function dimensionar(it) {
    const w = it.rec.lienzo.width, h = it.rec.lienzo.height;
    const k = Math.min((B * 0.82) / Math.sqrt(w * h), (B * 1.25) / w, (B * 1.3) / h);
    it.dw = w * k;
    it.dh = h * k;
    it.Z = Math.max(1, Math.min((movil ? H * 0.42 : H * 0.64) / it.dh, (movil ? W * 0.72 : W * 0.38) / it.dw));
    it.bw = it.dw * it.Z;
    it.bh = it.dh * it.Z;
    it.el.style.width = it.bw + "px";
    it.el.style.height = it.bh + "px";
    it.sw = it.dw * 0.92;
    it.sh = Math.max(14, it.dw * 0.16);
    it.sombra.style.width = it.sw + "px";
    it.sombra.style.height = it.sh + "px";
  }

  function pintar() {
    const p = suave(zoomP);
    for (const it of items) {
      // Ángulo en el círculo (0 = adelante al centro): los que vienen entran por la izquierda, como en el video
      const a = (distancia(it.i) / N) * Math.PI * 2, prof = (1 + Math.cos(a)) / 2; // prof: 1 adelante, 0 atrás
      let s = 0.5 + 0.5 * Math.pow(prof, 1.4);
      let x = W / 2 - RX * Math.sin(a);
      let piso = PISO - PROF * (1 - prof);
      // Flota: sube y baja suave, cada uno a su ritmo (la sombra se achica cuando sube)
      const flota = sinMovimiento ? 0 : Math.sin(reloj * 1.25 + it.fase);
      let alto = B * (0.08 + flota * 0.018) * s;
      let opac = 1, inclina = sinMovimiento ? 0 : limitar(-vel * 2.6, -5, 5) * prof;
      // Al aparecer la sección suben desde abajo de a uno
      let llega = 1;
      if (entradaT === null) llega = 0;
      else if (!sinMovimiento) llega = 1 - Math.pow(1 - limitar((reloj - entradaT - it.i * 0.09) / 0.8, 0, 1), 3);
      if (p > 0) {
        if (it === foco) {
          // El elegido se acerca: a la izquierda en el computador, arriba al centro en el celular
          x += ((movil ? W / 2 : W * 0.33) - x) * p;
          piso += ((movil ? H * 0.54 : H * 0.82) - piso) * p;
          s += (it.Z - s) * p;
          alto *= 1 - p * 0.35;
          inclina *= 1 - p;
        } else {
          // Los demás se abren hacia afuera y se desvanecen
          x = W / 2 + (x - W / 2) * (1 + p * 0.9);
          piso -= p * H * 0.06;
          opac = 1 - p;
        }
      }
      const y = piso - alto + (1 - llega) * 70;
      it.el.style.transform = `translate3d(${(x - it.bw / 2).toFixed(1)}px, ${(y - it.bh).toFixed(1)}px, 0) rotate(${inclina.toFixed(2)}deg) scale(${(s / it.Z).toFixed(4)})`;
      it.el.style.opacity = (opac * llega).toFixed(3);
      it.z = it === foco && p > 0 ? 500 : Math.round(prof * 100) + 1;
      it.el.style.zIndex = it.z;
      it.sombra.style.transform = `translate3d(${(x - it.sw / 2).toFixed(1)}px, ${(piso - it.sh / 2).toFixed(1)}px, 0) scale(${(s * (1 - flota * 0.05)).toFixed(3)})`;
      it.sombra.style.opacity = ((0.5 + 0.5 * prof) * (1 - flota * 0.12) * opac * llega).toFixed(3);
      // Los de más atrás quedan un poquito desenfocados, como en una foto con poca profundidad de campo
      const lejos = prof < 0.28 && it !== foco;
      if (lejos !== it.lejos) { it.lejos = lejos; it.el.classList.toggle("lejos", lejos); }
    }
  }

  function cuadro(t) {
    anim = 0;
    const dt = Math.min(0.05, Math.max(0.001, (t - antes) / 1000));
    antes = t;
    reloj += dt;
    if (N > 1) {
      // Acercado, la vitrina no gira (solo termina de dejarlo justo adelante)
      if (abierto && modo !== "meta") modo = "quieto";
      if (modo === "quieto" && !abierto && !sinMovimiento && performance.now() - quietoDesde > ESPERA_AUTO) modo = "auto";
      if (modo === "auto") {
        vel += (AUTO - vel) * (1 - Math.exp(-dt * 1.4));
        pos += vel * dt;
      } else if (modo === "inercia") {
        vel *= Math.exp(-dt * 2.4);
        pos += vel * dt;
        if (Math.abs(vel) < 0.7) { modo = "meta"; meta = Math.round(pos + vel * 0.25); }
      } else if (modo === "meta") {
        const d = meta - pos;
        vel = d * 7;
        pos += d * (1 - Math.exp(-dt * 7));
        if (Math.abs(d) < 0.002) { pos = meta; vel = 0; modo = "quieto"; quietoDesde = performance.now(); }
      } else if (modo === "quieto") vel = 0;
    }
    // Acercar o devolver a la vitrina
    const metaZoom = abierto ? 1 : 0;
    if (zoomP !== metaZoom) {
      zoomP = sinMovimiento ? metaZoom : zoomP + (metaZoom - zoomP) * (1 - Math.exp(-dt * 5.5));
      if (Math.abs(zoomP - metaZoom) < 0.002) zoomP = metaZoom;
    }
    if (!abierto && zoomP === 0) foco = null;
    pintar();
    const f = ((Math.round(pos) % N) + N) % N;
    if (f !== adelante) cambiarAdelante(f);
    if (visible || zoomP !== metaZoom) anim = requestAnimationFrame(cuadro);
  }
  const arrancar = () => {
    if (anim || !listo) return;
    antes = performance.now();
    anim = requestAnimationFrame(cuadro);
  };

  // Número, nombre y puntito del que quedó adelante. Al girarla con el dedo, cada uno que pasa hace "tic".
  function cambiarAdelante(f) {
    const habia = adelante;
    adelante = f;
    const it = items[f];
    $("#vitrina-num").textContent = String(f + 1).padStart(2, "0");
    $("#vitrina-nombre").textContent = it.p.nombre;
    puntos.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-current", String(i === f)));
    if (habia >= 0 && mostrado && modo !== "auto") sonidoTic(0.8);
  }

  // Gira hasta dejar adelante el accesorio i (por el camino más corto)
  function irA(i) {
    if (N < 2 || abierto) return;
    modo = "meta";
    meta = Math.round(pos + distancia(i));
    arrancar();
  }
  function girarUno(dir) {
    if (N < 2 || abierto) return;
    meta = (modo === "meta" ? meta : Math.round(pos)) + dir;
    modo = "meta";
    arrancar();
  }

  const fichaHtml = (p) => {
    const colores = p.colores.map((c) => {
      const css = colorCss(c);
      return `<li>${css ? `<i style="background:${css}"></i>` : ""}${esc(c)}</li>`;
    }).join("");
    const tallas = p.tallas.filter((t) => t.toLowerCase() !== "única");
    return `<p class="vf-cat">${esc(p.categoria)}</p>
      <h3 class="vf-nombre">${esc(p.nombre)}</h3>
      <p class="precio vf-precio">${precioHtml(p)}</p>
      ${colores ? `<ul class="vf-colores" aria-label="Colores">${colores}</ul>` : ""}
      ${tallas.length ? `<p class="vf-tallas">Tallas: ${tallas.map(esc).join(" · ")}</p>` : ""}
      <button class="ed-btn vf-comprar" data-comprar>Ver y comprar</button>`;
  };

  // El de adelante se acerca grande y aparece su ficha; detrás, el nombre de su categoría en letras gigantes
  function abrir(it) {
    if (abierto || !listo) return;
    if (N > 1) { meta = Math.round(pos + distancia(it.i)); modo = "meta"; }
    abierto = foco = it;
    palabra.textContent = it.p.categoria;
    ficha.innerHTML = fichaHtml(it.p);
    caja.classList.add("abierto");
    sonidoAire(0.9, true);
    const r = caja.getBoundingClientRect();
    if (r.top < tapado() || r.bottom > innerHeight)
      window.scrollTo({ top: r.top + scrollY - tapado() - Math.max(0, (innerHeight - tapado() - H) / 2), behavior: sinMovimiento ? "auto" : "smooth" });
    arrancar();
  }
  function cerrar(callado) {
    if (!abierto) return;
    abierto = null;
    caja.classList.remove("abierto");
    if (!callado) sonidoAire(0.6, false);
    quietoDesde = performance.now();
    arrancar();
  }

  // El accesorio que de verdad está bajo el dedo: el de adelante responde en todo su contorno (también en el
  // hueco de un cinturón enrollado); los de atrás, solo donde tienen algo pintado, así un toque en el aire
  // entre dos accesorios le llega al que se ve ahí
  function itemEn(cx, cy) {
    for (const it of [...items].sort((a, b) => b.z - a.z)) {
      if (Number(it.el.style.opacity) < 0.3) continue;
      const r = it.rec.lienzo.getBoundingClientRect(), m = it.alfa;
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
      if (it === abierto || Math.abs(distancia(it.i)) < 0.5) return it;
      const gx = Math.floor(((cx - r.left) / r.width) * m.w), gy = Math.floor(((cy - r.top) / r.height) * m.h);
      // Con un margen de dos cuadritos: así es fácil tocar las cosas finas (una cadena, unos lentes)
      for (let y = gy - 2; y <= gy + 2; y++)
        for (let x = gx - 2; x <= gx + 2; x++)
          if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.a[y * m.w + x] > 60) return it;
    }
    return null;
  }
  function tocar(it) {
    if (abierto) { if (it !== abierto) cerrar(); return; }
    if (!it) return;
    // El que está adelante (aunque la vitrina vaya girando) se acerca; uno de atrás viene adelante primero
    if (N < 2 || Math.abs(distancia(it.i)) < 0.5) abrir(it);
    else { sonidoToque(); irA(it.i); }
  }

  function crearItem(p, rec) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "giro";
    el.setAttribute("aria-label", `Ver ${p.nombre}`);
    rec.lienzo.className = "giro-foto";
    el.append(rec.lienzo);
    const sombra = document.createElement("span");
    sombra.className = "giro-sombra";
    return { p, rec, el, sombra, alfa: mapaAlfa(rec.lienzo), fase: Math.random() * Math.PI * 2, i: 0, z: 0, lejos: false };
  }

  async function armar() {
    if (empezo) return;
    empezo = true;
    for (const p of candidatos) {
      // La foto sin fondo del panel; si no hay (o no es PNG sin fondo), se recorta sola la que haya
      let rec = p.fotoVitrina ? await prendaSinFondo(p.fotoVitrina, 800) : null;
      for (const src of [p.fotoVitrina, ...p.fotos.slice(0, 3)]) {
        if (rec) break;
        if (src) rec = await recortarPrenda(src, 800);
      }
      await new Promise((ok) => setTimeout(ok));
      if (rec) items.push(crearItem(p, rec));
    }
    if (!items.length) { bloque.remove(); return; }
    N = items.length;
    items.forEach((it, i) => (it.i = i));
    escena.replaceChildren(...items.map((it) => it.el));
    sombras.replaceChildren(...items.map((it) => it.sombra));
    puntos.innerHTML = items.map((it, i) => `<button data-punto="${i}" aria-label="${esc(it.p.nombre)}"></button>`).join("");
    $("#vitrina-total").textContent = "/" + String(N).padStart(2, "0");
    caja.classList.toggle("solo", N < 2);
    medidas();
    listo = true;
    caja.classList.remove("cargando");
    pista.textContent = N < 2 ? `${clic() ? "Haz clic" : "Toca"} para verlo de cerca` : `${clic() ? "Arrastra" : "Desliza"} para girar · ${clic() ? "haz clic en" : "toca"} uno para verlo`;
    cambiarAdelante(0);
    pintar();
    const r = caja.getBoundingClientRect();
    visible = r.bottom > 0 && r.top < innerHeight;
    if (r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3) entrada();
    arrancar();
  }

  // Al llegar a la sección: los accesorios suben de a uno mientras la vitrina parte girando rápido y frena
  function entrada() {
    if (mostrado || !listo) return;
    mostrado = true;
    entradaT = reloj;
    if (sinMovimiento || N < 2) return;
    pos = -1.6;
    vel = 2.2;
    modo = "auto";
    arrancar();
  }

  // Con el dedo o el mouse: deslizar de lado la gira (con inercia al soltar); deslizar hacia arriba o abajo
  // sigue moviendo la página. Un toque sin deslizar trae ese accesorio adelante o lo acerca.
  escena.addEventListener("pointerdown", (e) => {
    if (!listo || e.button > 0) return;
    arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, pos0: pos, mueve: false, muestras: [[e.timeStamp, e.clientX]] };
  });
  escena.addEventListener("pointermove", (e) => {
    const a = arrastre;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (!a.mueve) {
      if (Math.abs(dx) < 8 || abierto || N < 2) return;
      if (Math.abs(dy) > Math.abs(dx)) { arrastre = null; return; }
      a.mueve = true;
      a.x = e.clientX;
      a.pos0 = pos;
      modo = "arrastre";
      vel = 0;
      caja.classList.add("arrastrando");
      try { escena.setPointerCapture(e.pointerId); } catch {}
    }
    pos = a.pos0 + (e.clientX - a.x) / pxPorItem();
    a.muestras.push([e.timeStamp, e.clientX]);
    if (a.muestras.length > 6) a.muestras.shift();
    const [t0, x0] = a.muestras[0];
    vel = e.timeStamp > t0 ? (e.clientX - x0) / pxPorItem() / ((e.timeStamp - t0) / 1000) : 0;
    arrancar();
  });
  const soltar = (e) => {
    const a = arrastre;
    if (!a || a.id !== e.pointerId) return;
    arrastre = null;
    caja.classList.remove("arrastrando");
    if (!a.mueve) {
      if (e.type === "pointerup") tocar(itemEn(e.clientX, e.clientY));
      return;
    }
    // Si soltó con el dedo ya quieto, no hay impulso
    const ultima = a.muestras[a.muestras.length - 1][0];
    if (e.timeStamp - ultima > 90) vel = 0;
    vel = limitar(vel, -6, 6);
    if (Math.abs(vel) > 0.7) {
      modo = "inercia";
      if (Math.abs(vel) > 1.6) sonidoAire(Math.min(0.55, Math.abs(vel) * 0.09), vel > 0);
    } else {
      modo = "meta";
      meta = Math.round(pos);
    }
    arrancar();
  };
  escena.addEventListener("pointerup", soltar);
  escena.addEventListener("pointercancel", soltar);
  // Con el teclado (Tab + Enter) se elige el accesorio enfocado
  escena.addEventListener("click", (e) => {
    if (e.detail !== 0) return;
    const el = e.target.closest(".giro");
    tocar(el ? items.find((it) => it.el === el) : null);
  });
  // Trackpad del computador: deslizar con dos dedos de lado la gira
  escena.addEventListener("wheel", (e) => {
    if (!listo || abierto || N < 2 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    modo = "arrastre";
    pos -= e.deltaX / pxPorItem();
    vel = limitar(-e.deltaX / pxPorItem() / 0.016, -6, 6);
    clearTimeout(rueda);
    rueda = setTimeout(() => { modo = "meta"; meta = Math.round(pos); arrancar(); }, 140);
    arrancar();
  }, { passive: false });
  caja.addEventListener("click", (e) => {
    const g = e.target.closest("[data-girar]");
    if (g) { girarUno(Number(g.dataset.girar)); return; }
    const p = e.target.closest("[data-punto]");
    if (p) irA(Number(p.dataset.punto));
  });
  caja.addEventListener("keydown", (e) => {
    if (abierto || !listo || !e.target.closest(".vitrina-escena")) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); girarUno(1); }
    if (e.key === "ArrowRight") { e.preventDefault(); girarUno(-1); }
  });
  $("#vitrina-cerrar").addEventListener("click", () => cerrar());
  ficha.addEventListener("click", (e) => {
    if (!e.target.closest("[data-comprar]") || !abierto) return;
    const id = abierto.p.id;
    cerrar(true);
    location.hash = "producto=" + encodeURIComponent(id);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && abierto && $("#modal").hidden) cerrar();
  });

  new ResizeObserver(() => {
    if (!listo || caja.clientWidth === W) return;
    medidas();
    pintar();
  }).observe(caja);
  // Se prepara un poco antes de llegar; mientras no se ve, no gira (ahorra batería)
  new IntersectionObserver(([e]) => { if (e.isIntersecting) armar(); }, { rootMargin: "1200px 0px" }).observe(bloque);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) cerrar(true);
    if (e.intersectionRatio >= 0.3) entrada();
    arrancar();
  }, { threshold: [0, 0.3] }).observe(caja);
}

// ---------- Lobo en moto que recorre los 4 pasos de "¿Cómo comprar?" ----------
// Al llegar a esta parte la moto entra por la izquierda y para en cada paso (se ilumina su tarjeta);
// en el último deja el paquete. Si se sale de la sección y se vuelve, se repite.
function prepararRuta() {
  const ruta = $("#ruta");
  if (!ruta) return;
  const moto = $("#ruta-moto");
  const paradas = [...ruta.querySelectorAll(".ruta-paradas span")];
  const pasos = [...document.querySelectorAll(".pasos li")];
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const centro = (i) => paradas[i].offsetLeft + paradas[i].offsetWidth / 2 - moto.offsetWidth / 2;
  let x = 0, turno = 0, corriendo = false, ultima = -1;
  const poner = (nx) => { x = nx; moto.style.transform = `translateX(${nx}px)`; };

  // Avanza hasta nx acelerando y frenando; devuelve false si mientras tanto se reinició
  async function ir(nx, mi) {
    // Velocidad pausada para que alcancen a leer (máx. 1,8 s por tramo: lo que dura el sonido del motor)
    const desde = x, dur = Math.min(1800, Math.max(850, (Math.abs(nx - desde) / 280) * 1000));
    poner(nx); // queda puesta en el destino; la animación la lleva hasta ahí
    moto.classList.add("andando", "acelera");
    const frenar = setTimeout(() => moto.classList.replace("acelera", "frena"), dur * 0.6);
    const chirrido = setTimeout(() => { if (mi === turno) sonidoFreno(); }, Math.max(0, dur - 230));
    const anim = moto.animate([{ transform: `translateX(${desde}px)` }, { transform: `translateX(${nx}px)` }], { duration: dur, easing: "cubic-bezier(.45,0,.3,1)" });
    sonidoMotor(dur / 1000);
    ralentiAndando(dur / 1000);
    try { await anim.finished; } catch { clearTimeout(chirrido); return false; } finally { clearTimeout(frenar); }
    moto.classList.remove("andando", "acelera", "frena");
    return mi === turno;
  }

  function soltarPaquete() {
    const p = document.createElement("div");
    p.className = "paquete";
    ruta.append(p);
    // Sale de la maleta (atrás y arriba de la moto) y cae al camino detrás de la rueda trasera
    const w = moto.offsetWidth, h = moto.offsetHeight, x0 = x + w * 0.15 - 10, y0 = -h * 0.58, x1 = x - 22;
    p.animate([
      { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0 - 14}px, ${y0 - 24}px) rotate(-25deg) scale(1)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${x1}px, 0) rotate(0deg) scale(1.08, .9)`, offset: 0.85 },
      { transform: `translate(${x1}px, 0) rotate(0deg) scale(1)` },
    ], { duration: 750, easing: "cubic-bezier(.3,.1,.5,1)", fill: "forwards" });
    // Golpe de la caja justo cuando toca el camino (al 85% de la caída)
    const mi = turno;
    setTimeout(() => { if (mi === turno) sonidoPaquete(); }, 640);
  }

  function reiniciar() {
    turno++;
    corriendo = false;
    ultima = -1;
    apagarMotor();
    moto.getAnimations().forEach((a) => a.cancel());
    moto.classList.remove("andando", "acelera", "frena");
    poner(-ruta.getBoundingClientRect().left - moto.offsetWidth - 20);
    paradas.forEach((p) => p.classList.remove("hecha", "actual"));
    pasos.forEach((p) => p.classList.remove("hecho", "activo"));
    ruta.querySelectorAll(".paquete").forEach((p) => p.remove());
  }

  async function recorrer() {
    if (corriendo || ultima >= 0) return;
    corriendo = true;
    const mi = ++turno;
    // El motor queda encendido todo el recorrido, en las paradas y después de dejar el paquete
    encenderMotor();
    for (let i = 0; i < paradas.length; i++) {
      if (!(await ir(centro(i), mi))) return;
      ultima = i;
      pasos.forEach((p, k) => p.classList.toggle("activo", k === i));
      paradas[i].classList.add("hecha", "actual");
      if (i === paradas.length - 1) break;
      await espera(1900); // tiempo en cada parada para leer la tarjeta
      if (mi !== turno) return;
      paradas[i].classList.remove("actual");
      pasos[i].classList.add("hecho");
    }
    soltarPaquete();
    corriendo = false;
  }

  // Si el teléfono pide menos movimiento, la moto queda estacionada en el último paso
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    poner(centro(paradas.length - 1));
    addEventListener("resize", () => poner(centro(paradas.length - 1)));
    return;
  }
  reiniciar();
  new IntersectionObserver(([e]) => {
    if (e.intersectionRatio >= 0.55) recorrer();
    else if (!e.isIntersecting) reiniciar();
  }, { threshold: [0, 0.55] }).observe($(".pasos"));
  // Al girar el teléfono o cambiar el tamaño, la moto estacionada se reacomoda en su parada
  addEventListener("resize", () => {
    if (corriendo || ultima < 0) return;
    poner(centro(ultima));
    ruta.querySelectorAll(".paquete").forEach((p) => {
      p.getAnimations().forEach((a) => a.cancel());
      p.style.transform = `translate(${x - 22}px, 0)`;
    });
  });
}

pintarFiltros();
pintarTallas();
pintarEditorial();
prepararRuta();
animarTitulos($(".pasos"));
pintarGrilla();
pintarBolsa();
revisarHash();
