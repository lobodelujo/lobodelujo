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

// ---------- Sonido de toque: sonidos/toque.wav (si no carga, se genera uno parecido) ----------
let ctxAudio = null, toque = null;
fetch("sonidos/toque.wav")
  .then((r) => r.arrayBuffer())
  .then((b) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(b))
  .then((b) => { toque = b; })
  .catch(() => {});
function sonidoToque() {
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (ctxAudio.state === "suspended") ctxAudio.resume();
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
  $("#editorial").innerHTML = categorias()
    .map((cat) => {
      const prods = PRODUCTOS.filter((p) => p.categoria === cat);
      if (!prods.length) return "";
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
        </section>`;
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
      </section>`;
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

pintarFiltros();
pintarTallas();
pintarEditorial();
animarTitulos($(".pasos"));
pintarGrilla();
pintarBolsa();
revisarHash();
