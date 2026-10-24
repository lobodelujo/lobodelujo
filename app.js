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
  ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
  if (ctxAudio.state === "suspended") ctxAudio.resume();
  return ctxAudio;
};
for (const t of ["pointerup", "touchend", "keydown"]) addEventListener(t, () => { try { audio(); } catch {} }, { capture: true, once: true });
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

// Esta categoría no lleva foto grande: se muestra como 6 fotos chicas (3 por fila)
const CATEGORIA_SEIS = "Accesorios";

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
  $("#editorial").innerHTML = categorias()
    .map((cat) => {
      const prods = PRODUCTOS.filter((p) => p.categoria === cat);
      if (!prods.length) return "";
      const perchero = cat === anclaPerchero ? percheroHtml() : "";
      if (cat === CATEGORIA_SEIS) {
        n++;
        // Siempre se ven las 6 casillas: las que faltan muestran "Próximamente" hasta que se agreguen productos
        const vacias = `<div class="ed-prod ed-vacio" aria-hidden="true">
            <span class="card-media"><img class="sin-foto" src="img/logo-lobo-128.png" alt=""></span>
            <span class="ed-prod-info"><span class="ed-prod-nombre">Próximamente</span></span>
          </div>`.repeat(Math.max(0, 6 - prods.length));
        return `<section class="ed-bloque">
          <div class="ed-cab"><h2>${esc(cat)}</h2></div>
          <div class="ed-seis">${prods.slice(0, 6).map(tarjetaChica).join("")}${vacias}</div>
          <a class="ed-btn ed-btn-solo" href="#catalogo" data-ver-cat="${esc(cat)}">Ver todo</a>
        </section>${perchero}`;
      }
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
    .join("") + (nuevos.length ? `
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
// Poleras y polerones colgados en un riel, como en la tienda. La página recorta sola cada prenda desde
// su foto 1 (frente) y su foto 2 (espalda) cuando tienen fondo claro y liso, como las del prompt LDL-01.
// Las fotos que no se pueden recortar limpio quedan fuera del perchero (igual se ven en el catálogo).
// Al deslizar, la ropa se mece; al tocar la del medio viene al frente con sus etiquetas y se puede girar.
const PERCHERO = ["Poleras", "Polerones"];
const PERCHERO_MAX = 16;

function percheroHtml() {
  const frases = [`${TIENDA.frase || ""} ${TIENDA.fraseAbajo || ""}`.trim(), "Nuevos drops", TIENDA.envio || "Envíos a todo Chile", TIENDA.nombre]
    .filter(Boolean)
    .map((t) => `<span>${esc(t)}</span><span>✦</span>`)
    .join("");
  return `<section class="ed-bloque perchero-bloque" id="perchero-bloque">
    <div class="ed-cab"><h2>El Perchero de Lobo</h2></div>
    <div class="perchero cargando esperando" id="perchero">
      <svg class="perchero-defs" width="0" height="0" aria-hidden="true">
        <linearGradient id="perchero-madera" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#efd8b0"/><stop offset=".45" stop-color="#ddbd8e"/><stop offset="1" stop-color="#c49d6a"/>
        </linearGradient>
        <!-- Lobo grabado a fuego, como un grabado láser: las líneas oscuras del logo quedan bien quemadas,
             el relleno apenas tostado y un brillo fino abajo da la profundidad del grabado -->
        <filter id="perchero-grabado" x="-10%" y="-10%" width="120%" height="130%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 .3  0 0 0 0 .17  0 0 0 0 .08  -.3 -.59 -.11 0 1" result="lineas"/>
          <feComposite in="lineas" in2="SourceAlpha" operator="in" result="lineasDentro"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 .5  0 0 0 0 .32  0 0 0 0 .16  0 0 0 .32 0" result="tostado"/>
          <feOffset in="SourceAlpha" dy=".7" result="abajo"/>
          <feColorMatrix in="abajo" type="matrix" values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .84  0 0 0 .5 0" result="brillo"/>
          <feComposite in="brillo" in2="SourceAlpha" operator="out" result="borde"/>
          <feMerge><feMergeNode in="borde"/><feMergeNode in="tostado"/><feMergeNode in="lineasDentro"/></feMerge>
        </filter>
      </svg>
      <img class="perchero-logo" src="img/logo-lobo-128.png" alt="" width="128" height="128">
      <div class="perchero-riel" aria-hidden="true"></div>
      <div class="perchero-pista" id="perchero-pista" aria-label="Prendas colgadas"></div>
      <button class="flecha izq" data-correr="-1" aria-label="Prenda anterior">‹</button>
      <button class="flecha der" data-correr="1" aria-label="Prenda siguiente">›</button>
      <button class="perchero-cerrar" id="perchero-cerrar" aria-label="Volver al perchero">×</button>
      <div class="perchero-info" id="perchero-info" aria-live="polite"><p class="pi-pista">Colgando la ropa…</p></div>
      <div class="perchero-cinta" aria-hidden="true"><div class="cinta-pista">${frases.repeat(6)}</div></div>
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

function prepararPerchero() {
  const bloque = $("#perchero-bloque");
  if (!bloque) return;
  const caja = $("#perchero"), pista = $("#perchero-pista"), info = $("#perchero-info");
  const candidatos = PRODUCTOS.filter((p) => PERCHERO.includes(p.categoria) && p.disponible && p.fotos.length).slice(0, PERCHERO_MAX);
  if (candidatos.length < 3) { bloque.remove(); return; }

  const RIEL = 74; // distancia del riel al borde de arriba del panel
  // Física de la ropa colgada (resorte con roce) y de las etiquetas (más livianas, se mecen más)
  const K = 52, C = 2.6, K_ET = 95, C_ET = 1.8;
  let items = [], G = 220, S = 92, E = 60, GANCHO = 38, altoRack = 560;
  let centro = -1, abierto = null, zoomP = 0, Z = 1, anim = 0, antes = 0, scrollAntes = 0, vel = 0;
  let empezo = false, listo = false, mostrado = false, girando = false, anchoAntes = 0;
  const suave = (t) => t * t * (3 - 2 * t);

  // Percha de lujo de madera clara y hombros anchos (como las de las tiendas de marca): por la abertura del
  // cuello se ve la madera de los hombros (se pierde en la tela a los lados), sobre el cuello asoma el bloque
  // central con el lobo grabado a fuego y de ahí sube el gancho de acero satinado al riel.
  // En un polerón con capucha la percha queda escondida: solo asoma el gancho.
  // Vista de espalda: la percha queda detrás de la prenda (se ve el borde del cuello de la espalda entero),
  // la barra no se ve y el bloque asoma desde dentro del cuello, por su lado sin grabado.
  // El (0,0) es donde el gancho toca el riel · e: escala de la foto · arriba: dónde empieza la foto
  let nPercha = 0;
  function pintarGancho(it, rec, e, arriba) {
    const atras = rec === it.espalda;
    it.gancho.classList.toggle("detras", atras);
    const s = G / 230, n = rec.perfil.length - 1, alto = rec.lienzo.height * e, id = "percha" + ++nPercha;
    const yCuello = arriba + rec.gy * e;
    // Capucha: junto al cuello (a un cuarto del ancho) la prenda queda mucho más abajo que al centro
    const yHombros = arriba + ((rec.perfil[Math.round(n * 0.25)][1] + rec.perfil[Math.round(n * 0.75)][1]) / 2) * e;
    const capucha = yHombros - yCuello > alto * 0.1;
    const grosor = 6 * s, mitad = G * 0.1, yBarra = yCuello + alto * 0.05, comba = 1.4 * s;
    const barra = `M${-mitad} ${yBarra} Q0 ${yBarra - comba * 2} ${mitad} ${yBarra}`;
    // Bloque central: trapecio más ancho abajo, con la cara de arriba más clara (como en la foto de referencia)
    const abajo = 15 * s, tope = 11 * s, altoB = 23 * s, yBase = yBarra + grosor * 0.35, yTope = capucha ? yCuello + 2 * s : yBase - altoB;
    const bloque = `M${-abajo} ${yBase} L${-tope} ${yTope + 1.5 * s} Q${-tope} ${yTope} ${-tope + 1.5 * s} ${yTope} L${tope - 1.5 * s} ${yTope} Q${tope} ${yTope} ${tope} ${yTope + 1.5 * s} L${abajo} ${yBase} Z`;
    const logo = 15.5 * s;
    const gancho = `M0 ${yTope + s} L0 8 C0 3 6.5 3 6.5 -2 C6.5 -7.5 2 -9.5 -2 -8 C-5 -6.8 -6 -4 -4.8 -1.6`;
    // El bloque de madera con su veta y el canto de arriba más claro (se ve por delante y por detrás)
    const cuerpo = `
      <path d="${bloque}" fill="url(#perchero-madera)" stroke="#a37b4c" stroke-width="${0.6 * s}"/>
      <g clip-path="url(#${id}c)" fill="none" stroke="#b8925f" stroke-width="${0.45 * s}" opacity=".55">
        <path d="M${-8 * s} ${yBase} C${-7 * s} ${yBase - 9 * s} ${-9 * s} ${yTope + 8 * s} ${-6.5 * s} ${yTope}"/>
        <path d="M${7 * s} ${yBase} C${8 * s} ${yBase - 10 * s} ${5.5 * s} ${yTope + 9 * s} ${7 * s} ${yTope}"/>
        <path d="M${-12 * s} ${yBase} C${-11 * s} ${yBase - 6 * s} ${-11.5 * s} ${yTope + 12 * s} ${-9.5 * s} ${yTope + 3 * s}"/>
        <path d="M${12.5 * s} ${yBase} C${11 * s} ${yBase - 7 * s} ${11.5 * s} ${yTope + 11 * s} ${9.5 * s} ${yTope + 3 * s}"/>
      </g>
      <rect x="${-tope + 1.2 * s}" y="${yTope + 0.4 * s}" width="${(tope - 1.2 * s) * 2}" height="${1.6 * s}" rx="${0.8 * s}" fill="#f6e6c6" opacity=".9"/>`;
    const madera = capucha ? "" : atras ? `<defs><clipPath id="${id}c"><path d="${bloque}"/></clipPath></defs>${cuerpo}` : `
      <defs>
        <linearGradient id="${id}f" gradientUnits="userSpaceOnUse" x1="${-mitad}" x2="${mitad}" y1="0" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".28" stop-color="#fff"/>
          <stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
        <mask id="${id}m" maskUnits="userSpaceOnUse" x="${-mitad - 10}" y="${yBarra - 20}" width="${mitad * 2 + 20}" height="40">
          <rect x="${-mitad}" y="${yBarra - 20}" width="${mitad * 2}" height="40" fill="url(#${id}f)"/>
        </mask>
        <clipPath id="${id}c"><path d="${bloque}"/></clipPath>
      </defs>
      <g mask="url(#${id}m)">
        <path d="${barra}" fill="none" stroke="#a37b4c" stroke-width="${grosor + 1}"/>
        <path d="${barra}" fill="none" stroke="#d6b383" stroke-width="${grosor}"/>
        <path d="${barra}" fill="none" stroke="#ebd2a8" stroke-width="${grosor * 0.45}" transform="translate(0 ${-grosor * 0.2})"/>
        <path d="${barra}" fill="none" stroke="#b8925f" stroke-width="${grosor * 0.1}" stroke-dasharray="${13 * s} ${5 * s} ${4 * s} ${8 * s}" opacity=".6" transform="translate(0 ${grosor * 0.18})"/>
      </g>${cuerpo}
      <image href="img/logo-lobo-128.png" x="${-logo / 2}" y="${yBase - altoB * 0.5 - logo * 0.42}" width="${logo}" height="${logo}" filter="url(#perchero-grabado)"/>`;
    it.gancho.innerHTML = `<svg width="1" height="1" overflow="visible" aria-hidden="true">
      <path d="${gancho}" fill="none" stroke="#6f737a" stroke-width="${2.8 * s}" stroke-linecap="round"/>
      <path d="${gancho}" fill="none" stroke="#c3c7cd" stroke-width="${1.9 * s}" stroke-linecap="round"/>
      <path d="${gancho}" fill="none" stroke="#f5f6f8" stroke-width="${0.6 * s}" stroke-linecap="round" transform="translate(${-0.45 * s} ${-0.3 * s})"/>${madera}
    </svg>`;
  }

  // Una polera o polerón colgado nunca es mucho más alto que ancho: si lo es, la foto era de una persona
  const esPrenda = (rec) => !!rec && rec.lienzo.height / rec.lienzo.width <= 1.45;

  // cual: el número de foto del producto que se usó para colgarlo (la de la prenda sola)
  function crearItem(p, rec, cual) {
    const el = document.createElement("button");
    el.className = "colgado";
    el.setAttribute("aria-label", `Ver ${p.nombre}`);
    // La percha va encima de la foto: se ve por la abertura del cuello, como en una polera colgada de verdad
    el.innerHTML = `<span class="colgado-mueve"><span class="colgado-llega"><span class="prenda"></span><span class="gancho"></span></span></span>`;
    // Cada prenda pesa y cuelga un poco distinto: así no se mecen todas iguales, como robots
    return { p, el, mover: el.firstElementChild, llega: el.querySelector(".colgado-llega"), gancho: el.querySelector(".gancho"), prenda: el.querySelector(".prenda"),
      cual, frente: rec, alta: null, espalda: undefined, actual: rec, alto: 0, th: 0, w: 0, etiquetas: null,
      k: K * (0.8 + Math.random() * 0.4), c: C * (0.85 + Math.random() * 0.3), masa: 0.85 + Math.random() * 0.3 };
  }

  // Pone una foto recortada en la percha: todas del mismo ancho y con el cuello justo bajo el gancho
  function ponerLienzo(it, rec) {
    it.actual = rec;
    let e = G / rec.lienzo.width;
    if (rec.lienzo.height * e > G * 1.3) e = (G * 1.3) / rec.lienzo.height;
    const s = it.prenda.style, arriba = GANCHO - rec.gy * e + 1;
    s.left = -rec.gx * e + "px";
    s.top = arriba + "px";
    s.width = rec.lienzo.width * e + "px";
    s.height = rec.lienzo.height * e + "px";
    s.transformOrigin = `${rec.gx * e}px 0`;
    if (rec.lienzo.parentNode !== it.prenda) it.prenda.replaceChildren(rec.lienzo);
    it.alto = rec.lienzo.height * e;
    pintarGancho(it, rec, e, arriba);
  }

  function medidas() {
    const ancho = caja.clientWidth, movil = ancho < 700;
    anchoAntes = ancho;
    G = movil ? Math.min(270, ancho * 0.62) : 230;
    S = G * (movil ? 0.55 : 0.58);
    E = G * 0.14;
    GANCHO = Math.round(G * 0.19);
    altoRack = Math.round(RIEL + GANCHO + G * 1.3 + 150);
    caja.style.setProperty("--slot", S + "px");
    caja.style.setProperty("--relleno", (ancho - S) / 2 + "px");
    caja.style.setProperty("--flecha-y", RIEL + GANCHO + G * 0.55 + "px");
    if (!abierto) caja.style.height = altoRack + "px";
    for (const it of items) ponerLienzo(it, it.actual);
  }

  // Como en un perchero de verdad: todas las prendas cuelgan de frente, juntas y montadas por las mangas.
  // La del medio se adelanta un poco más grande y las de al lado le hacen espacio.
  function pintar() {
    const pos = pista.scrollLeft / S;
    let menor = Infinity, c = -1;
    items.forEach((it, i) => {
      const d = i - pos, a = Math.min(1, Math.abs(d)), sg = Math.sign(d), elegido = abierto === it;
      if (Math.abs(d) < menor) { menor = Math.abs(d); c = i; }
      const base = 1 + 0.1 * (1 - a);
      const sc = elegido ? base + (Z - base) * suave(zoomP) : base;
      it.mover.style.transform = `translateX(${(sg * E * a).toFixed(1)}px) rotateZ(${it.th.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      it.el.style.zIndex = elegido ? 200 : 100 - Math.round(Math.abs(d) * 10);
    });
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
    const meta = abierto ? 1 : 0;
    if (zoomP !== meta) {
      zoomP = sinMovimiento ? meta : zoomP + (meta - zoomP) * (1 - Math.exp(-dt * 6));
      if (Math.abs(zoomP - meta) < 0.002) zoomP = meta;
      sigue = true;
    }
    const c = pintar();
    if (c !== centro) cambiarCentro(c);
    if (sigue) anim = requestAnimationFrame(cuadro);
    // Quieto: el navegador vuelve a dibujar las prendas nítidas a su tamaño final (sobre todo la acercada)
    else caja.classList.add("quieto");
  }
  const arrancar = () => {
    if (anim || !listo) return;
    caja.classList.remove("quieto");
    antes = performance.now();
    anim = requestAnimationFrame(cuadro);
  };

  const ayuda = () => (matchMedia("(hover: hover)").matches ? "Pasa el mouse por la ropa y haz clic en la del medio 👆" : "Desliza el perchero y toca la prenda del medio 👆");
  function pintarInfo() {
    const it = items[centro];
    if (!it) return;
    info.innerHTML = `<p class="pi-nombre">${esc(it.p.nombre)}</p><p class="precio pi-precio">${precioHtml(it.p)}</p><p class="pi-pista">${ayuda()}</p>`;
  }
  function cambiarCentro(c) {
    const habia = centro;
    centro = c;
    if (!items[c]) return;
    items.forEach((it, i) => it.el.classList.toggle("centro", i === c));
    if (abierto) return;
    if (habia >= 0 && mostrado) sonidoGancho(0.8);
    pintarInfo();
  }

  // Las etiquetas de la tienda cuelgan del hombro: la negra con el precio y la de cartón con las tallas
  function colgarEtiquetas(it) {
    const grupo = document.createElement("span");
    grupo.className = "etiquetas";
    grupo.style.cssText = `left:${(G * 0.34).toFixed(1)}px;top:${(GANCHO + it.alto * 0.08).toFixed(1)}px`;
    const tallas = it.p.tallas.filter((t) => t.toLowerCase() !== "única");
    grupo.innerHTML = `<span class="etiqueta negra"><i></i><span class="carton"><img src="img/logo-lobo-128.png" alt=""><b>${fmt(it.p.precio)}</b></span></span>` +
      (tallas.length ? `<span class="etiqueta kraft"><i></i><span class="carton"><small>Tallas</small><b>${tallas.map(esc).join(" ")}</b></span></span>` : "");
    it.llega.append(grupo);
    // Cuelgan del mismo punto abiertas en abanico (reposo, en grados) y entran balanceándose
    it.etiquetas = [...grupo.querySelectorAll(".etiqueta")].map((el, k) => ({ el, th: k ? -60 : -40, w: 0, reposo: k ? -22 : 16 }));
    requestAnimationFrame(() => grupo.classList.add("visible"));
  }

  // Lo que tapan arriba la barra y la fila de categorías (las dos quedan pegadas al bajar)
  const tapado = () => $(".barra").offsetHeight + ($(".categorias") ? $(".categorias").offsetHeight : 0);
  function altoZoom() {
    return Math.round(Math.max(altoRack + 80, Math.min(innerHeight - tapado(), altoRack * 1.75)));
  }

  async function abrir(it) {
    if (abierto || !listo) return;
    abierto = it;
    sonidoTela();
    const alto = altoZoom();
    caja.style.height = alto + "px";
    Z = Math.max(1.1, Math.min(1.8, (alto - RIEL - 205) / (GANCHO + it.alto)));
    caja.classList.add("abierto");
    it.el.classList.add("elegido");
    info.innerHTML = `<p class="pi-nombre">${esc(it.p.nombre)}</p><p class="precio pi-precio">${precioHtml(it.p)}</p>
      <div class="pi-lados" role="group" aria-label="Lado de la prenda" hidden>
        <button data-lado="frente" aria-pressed="true">Frente</button><button data-lado="espalda" aria-pressed="false">Espalda</button>
      </div>
      <button class="ed-btn pi-comprar" data-comprar>Elegir talla y comprar</button>`;
    colgarEtiquetas(it);
    it.w += 70;
    arrancar();
    window.scrollTo({ top: caja.getBoundingClientRect().top + scrollY - tapado(), behavior: sinMovimiento ? "auto" : "smooth" });
    // Cuando termina de acercarse: la foto en alta y la espalda (la siguiente foto del producto que
    // también sea la prenda sola y de la misma forma)
    await new Promise((ok) => setTimeout(ok, 700));
    if (abierto !== it) return;
    if (!it.alta) it.alta = await recortarPrenda(it.p.fotos[it.cual], 1200);
    if (abierto !== it) return;
    if (it.alta && it.actual === it.frente) ponerLienzo(it, it.alta);
    if (it.espalda === undefined) {
      const base = it.alta || it.frente, prop = (x) => x.lienzo.height / x.lienzo.width;
      it.espalda = null;
      for (let f = 0; f < it.p.fotos.length && !it.espalda; f++) {
        if (f === it.cual) continue;
        const rec = await recortarPrenda(it.p.fotos[f], 1200);
        if (abierto !== it) return;
        if (esPrenda(rec) && Math.abs(prop(rec) - prop(base)) < prop(base) * 0.25) it.espalda = rec;
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
    it.el.classList.remove("elegido");
    caja.style.height = altoRack + "px";
    const grupo = it.llega.querySelector(".etiquetas");
    if (grupo) { grupo.classList.remove("visible"); setTimeout(() => grupo.remove(), 350); }
    it.etiquetas = null;
    it.w -= 50;
    sonidoGancho(0.7);
    pintarInfo();
    arrancar();
    // Ya de vuelta en el riel, se suelta la foto en alta para no gastar memoria del teléfono
    setTimeout(() => {
      if (abierto === it) return;
      if (it.actual !== it.frente) ponerLienzo(it, it.frente);
      for (const r of [it.alta, it.espalda]) if (r) r.lienzo.width = 0;
      it.alta = null;
      it.espalda = undefined;
    }, 700);
  }

  // Frente / Espalda: la prenda gira sobre la percha y a mitad de giro cambia de foto
  async function girar(aEspalda) {
    const it = abierto;
    if (!it || girando) return;
    const rec = aEspalda ? it.espalda : it.alta || it.frente;
    if (!rec || rec === it.actual) return;
    girando = true;
    sonidoTela(0.5);
    const media = "perspective(900px) rotateY(90deg)";
    if (!sinMovimiento) await it.prenda.animate([{ transform: "perspective(900px) rotateY(0deg)" }, { transform: media }], { duration: 220, easing: "ease-in" }).finished.catch(() => {});
    ponerLienzo(it, rec);
    info.querySelectorAll("[data-lado]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.lado === "espalda") === aEspalda)));
    if (!sinMovimiento) await it.prenda.animate([{ transform: "perspective(900px) rotateY(-90deg)" }, { transform: "perspective(900px) rotateY(0deg)" }], { duration: 320, easing: "cubic-bezier(.2,.8,.3,1)" }).finished.catch(() => {});
    it.w += aEspalda ? 40 : -40;
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
    // Las fotos 1 se descargan todas a la vez y se recortan de a una (deja respirar a la página entre foto y foto).
    // Si la foto 1 no sirve (por ejemplo, es con modelo), se prueba con las demás fotos del producto.
    const cargas = candidatos.map((p) => cargarImagen(p.fotos[0]).catch(() => null));
    for (const [k, p] of candidatos.entries()) {
      for (let f = 0; f < p.fotos.length; f++) {
        const rec = await recortarPrenda(f ? p.fotos[f] : cargas[k], 640);
        await new Promise((ok) => setTimeout(ok));
        if (!esPrenda(rec)) continue;
        items.push(crearItem(p, rec, f));
        fondos.push(rec.fondo);
        break;
      }
    }
    if (items.length < 3) { bloque.remove(); return; }
    // La pared toma el mismo gris de las fotos: así cualquier borde del recorte queda invisible
    const pared = [0, 1, 2].map((k) => Math.round(fondos.reduce((s, f) => s + f[k], 0) / fondos.length));
    caja.style.setProperty("--pared", `rgb(${pared.join(",")})`);
    pista.replaceChildren(...items.map((it) => it.el));
    caja.classList.remove("cargando");
    medidas();
    listo = true;
    // En el celular la segunda prenda queda al medio (como el carrusel); en el computador, la del medio
    pista.scrollLeft = (caja.clientWidth < 700 ? 1 : Math.floor((items.length - 1) / 2)) * S;
    scrollAntes = pista.scrollLeft;
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
    if (!el) return;
    const i = items.findIndex((it) => it.el === el);
    if (i === centro) abrir(items[i]);
    else pista.scrollTo({ left: i * S, behavior: "smooth" });
  });
  // Con el teclado (Tab) la prenda elegida pasa al medio
  pista.addEventListener("focusin", (e) => {
    const i = items.findIndex((it) => it.el === e.target);
    if (i >= 0 && i !== centro && !abierto && e.target.matches(":focus-visible")) pista.scrollTo({ left: i * S, behavior: "smooth" });
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && abierto && $("#modal").hidden) cerrar(); });

  new ResizeObserver(() => {
    if (!listo || caja.clientWidth === anchoAntes) return;
    medidas();
    pista.scrollLeft = Math.max(0, centro) * S;
    pintar();
  }).observe(caja);
  // Se prepara un poco antes de llegar; al verse, la ropa se cuelga. Si se sale de la sección, la prenda vuelve al riel.
  new IntersectionObserver(([e]) => { if (e.isIntersecting) colgarTodo(); }, { rootMargin: "1200px 0px" }).observe(bloque);
  new IntersectionObserver(([e]) => {
    caja.classList.toggle("fuera", !e.isIntersecting);
    if (!e.isIntersecting) cerrar();
    if (e.intersectionRatio >= 0.3) entrada();
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
