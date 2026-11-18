// Orden del carrito: /orden?d=...
// El carrito (app.js > linkOrden) mete el pedido dentro del link y lo manda por WhatsApp como "NUEVA ORDEN".
// Aquí se dibuja con el formato de Lobo de Lujo: logo, NUEVA ORDEN, foto de cada prenda con su nombre,
// talla y color, tabla de cantidades, subtotal, envío y total.
// Los precios son los que vio el cliente; si alguno ya no coincide con el catálogo, aparece un aviso.

// Igual que en functions/p/[id].js y cargar.js, para encontrar cada prenda por su link
const slug = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const lista = (v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => String(x ?? "").trim()).filter(Boolean);
const codigoFoto = (p) => {
  const f = String(lista(p.fotos)[0] || "").split("/").pop();
  const m = f.match(/^\d{8}-\d{6}-([a-z0-9]+)-/i);
  return m ? m[1].toLowerCase() : slug(f.replace(/\.[^.]+$/, ""));
};
const unico = (usados, base) => {
  let s = base, n = 2;
  while (usados.has(s)) s = `${base}-${n++}`;
  usados.add(s);
  return s;
};
const precio = (n) => "$" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// "Poleras" -> "polera", como en la tabla de la orden
const TIPO = { poleras: "polera", polerones: "polerón", gorras: "gorra", shorts: "short", pantalones: "pantalón", lentes: "lentes", accesorios: "accesorio" };
const tipo = (cat) => {
  const c = String(cat || "").trim().toLowerCase();
  return TIPO[c] || c.replace(/es$|s$/, "") || "prenda";
};

function leerOrden(d) {
  const b64 = String(d || "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const o = JSON.parse(new TextDecoder().decode(bytes));
  if (!o || !Array.isArray(o.i) || !o.i.length) throw new Error("vacía");
  return {
    fecha: Number(o.f) || 0,
    envio: ["a", "r", "x"].includes(o.e) ? o.e : "r",
    costoEnvio: Math.max(0, Number(o.k) || 0),
    items: o.i.slice(0, 50).map((x) => ({
      id: String(x[0] || ""),
      nombre: String(x[1] || "Prenda").slice(0, 80),
      categoria: String(x[2] || ""),
      talla: String(x[3] || "").slice(0, 20),
      color: String(x[4] || "").slice(0, 40),
      cant: Math.min(99, Math.max(1, Math.round(Number(x[5]) || 1))),
      precio: Math.max(0, Math.round(Number(x[6]) || 0)),
      foto: String(x[7] || ""),
    })),
  };
}

// Prendas del catálogo de hoy, por su link, para avisar si el precio cambió o si ya no está
async function catalogoPorId(env, origin) {
  const mapa = new Map();
  try {
    const r = await env.ASSETS.fetch(new URL("/datos/productos.json", origin));
    const datos = await r.json();
    const crudos = (datos.productos || []).filter((x) => x && x.nombre);
    const veces = {};
    for (const x of crudos) { const b = slug(x.nombre) || "producto"; veces[b] = (veces[b] || 0) + 1; }
    const usados = new Set(), viejos = new Set();
    for (const x of crudos) {
      const base = slug(x.nombre) || "producto";
      mapa.set(unico(usados, veces[base] > 1 ? [base, codigoFoto(x)].filter(Boolean).join("-") : base), x);
      const viejo = unico(viejos, base);
      if (!mapa.has(viejo)) mapa.set(viejo, x);
    }
  } catch {}
  return mapa;
}

const fotoUrl = (rel, origin) => {
  if (!rel) return `${origin}/img/logo-lobo-256.png`;
  if (/^https?:\/\//i.test(rel)) return rel;
  return new URL(String(rel).replace(/^\//, ""), origin + "/").href;
};

const respuesta = (html, estado = 200) =>
  new Response(html, {
    status: estado,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" },
  });

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;

  let orden;
  try { orden = leerOrden(url.searchParams.get("d")); }
  catch {
    return respuesta(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Orden · Lobo de Lujo</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:sans-serif;background:#ececec;text-align:center">
<div><img src="/img/logo-lobo-128.png" alt="" width="80"><p>Este link de orden no es válido o está incompleto.</p><p><a href="/">Ir al catálogo</a></p></div></body></html>`, 400);
  }

  const catalogo = await catalogoPorId(env, origin);
  const subtotal = orden.items.reduce((t, i) => t + i.precio * i.cant, 0);
  const total = subtotal + (orden.envio === "a" ? orden.costoEnvio : 0);
  const unidades = orden.items.reduce((t, i) => t + i.cant, 0);
  const lineaEnvio = {
    a: ["PAGO ENVÍO", precio(orden.costoEnvio)],
    r: ["ENVÍO", "Por pagar al recibir"],
    x: ["ENVÍO", "Delivery gratis · Antofagasta"],
  }[orden.envio];
  const fecha = orden.fecha
    ? new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" }).format(new Date(orden.fecha))
    : "";
  const numero = orden.fecha ? orden.fecha.toString(36).slice(-5).toUpperCase() : "";

  const prendas = orden.items.map((i) => {
    const hoy = catalogo.get(i.id);
    let aviso = "";
    if (!hoy) aviso = "Esta prenda ya no está en el catálogo";
    else if (Math.round(Number(hoy.precio) || 0) !== i.precio) aviso = `Precio actual en el catálogo: ${precio(hoy.precio)}`;
    const detalles = [i.talla && `TALLA ${i.talla}`, i.color && `Color ${i.color.toLowerCase()}`].filter(Boolean);
    return `<div class="prenda">
      <div class="foto-col">
        <div class="foto"><img src="${esc(fotoUrl(i.foto, origin))}" alt="${esc(i.nombre)}" loading="lazy"></div>
        <div class="marca">${esc(i.nombre)}</div>
      </div>
      <div class="info">
        <ul>${detalles.map((t) => `<li>${esc(t)}</li>`).join("")}${i.cant > 1 ? `<li>${i.cant} unidades</li>` : ""}</ul>
        ${aviso ? `<p class="aviso">⚠️ ${esc(aviso)}</p>` : ""}
      </div>
    </div>`;
  }).join("");

  const filas = orden.items
    .map((i) => `<span>${i.cant}</span><span>${esc(tipo(i.categoria))}</span><span>${precio(i.precio)}</span>`)
    .join("");

  const titulo = `NUEVA ORDEN · ${precio(total)}`;
  const descripcion = `${unidades} ${unidades === 1 ? "prenda" : "prendas"} · ${lineaEnvio[1] === precio(orden.costoEnvio) ? `Envío sumado (${lineaEnvio[1]})` : lineaEnvio[1]}`;
  const imagen = fotoUrl(orden.items[0].foto, origin);

  return respuesta(`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titulo)} · Lobo de Lujo</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lobo de Lujo">
<meta property="og:title" content="🧾 ${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:image" content="${esc(imagen)}">
<link rel="icon" type="image/png" href="/img/logo-lobo-128.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ececec; font-family: "Open Sans", system-ui, sans-serif; color: #111; padding: 18px 12px 40px; }
  .orden { max-width: 560px; margin: 0 auto; background: #fff; border: 6px solid #e4e4e4; padding: 26px 22px 30px; }
  .cab { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 22px; }
  .cab img { width: clamp(44px, 13vw, 64px); height: auto; }
  .cab h1 { font-size: clamp(22px, 7.4vw, 46px); white-space: nowrap; font-weight: 800; letter-spacing: .5px; color: #ffb648; -webkit-text-stroke: 1.5px #8a5a10; line-height: 1; }
  .prendas { display: grid; gap: 22px; }
  .prendas.una { border: 5px solid #1a1a1a; border-radius: 24px; padding: 16px; }
  .prenda { display: grid; grid-template-columns: 46% 1fr; gap: 16px; align-items: center; }
  .foto { background: #e9e9eb; aspect-ratio: 9 / 10; display: grid; place-items: center; overflow: hidden; }
  .foto img { width: 100%; height: 100%; object-fit: contain; }
  .marca { border: 1.5px solid #d6d2c8; padding: 8px 6px; text-align: center; font-weight: 800; font-size: clamp(14px, 4.4vw, 22px); text-transform: uppercase; line-height: 1.15; word-break: break-word; }
  .info ul { list-style: none; display: grid; gap: 6px; }
  .info li { font-weight: 700; font-size: clamp(16px, 4.8vw, 24px); position: relative; padding-left: 20px; }
  .info li::before { content: ""; position: absolute; left: 2px; top: .55em; width: 9px; height: 9px; border-radius: 50%; background: #111; }
  .aviso { margin-top: 10px; font-size: 12px; font-weight: 600; color: #a35b00; background: #fff4e0; border-radius: 8px; padding: 6px 8px; }
  .tabla { display: grid; grid-template-columns: 1fr 1fr 1.3fr; text-align: center; row-gap: 10px; margin: 30px 0 34px; }
  .tabla .t { font-size: clamp(11px, 3.3vw, 14px); font-weight: 700; text-transform: uppercase; }
  .tabla span:not(.t) { font-size: clamp(16px, 4.8vw, 22px); font-weight: 700; }
  .totales { border-top: 3px solid #111; padding-top: 14px; display: grid; grid-template-columns: 1fr auto; row-gap: 10px; align-items: baseline; }
  .totales .n { font-size: clamp(12px, 3.6vw, 15px); font-weight: 700; text-transform: uppercase; }
  .totales .v { font-size: clamp(14px, 4vw, 17px); font-weight: 700; text-align: right; }
  .totales .raya { grid-column: 2; border-top: 3px solid #111; width: 100%; min-width: 120px; margin-top: 4px; }
  .total { display: flex; justify-content: flex-end; align-items: baseline; gap: clamp(20px, 7vw, 48px); margin-top: 14px; }
  .total b { font-size: clamp(26px, 8vw, 38px); font-weight: 800; }
  .total strong { font-size: clamp(24px, 7.4vw, 34px); font-weight: 800; }
  .pie { margin-top: 26px; display: flex; justify-content: space-between; gap: 10px; color: #8a8a8a; font-size: 12px; font-weight: 600; }
  /* Solo para la tienda: responder "Disponible" al cliente */
  .tienda { max-width: 560px; margin: 16px auto 0; display: grid; gap: 8px; }
  .solo { text-align: center; font-size: 12px; font-weight: 700; color: #777; }
  button { font: inherit; cursor: pointer; }
  .btn-ok { border: 0; border-radius: 999px; padding: 15px 18px; background: #25d366; color: #06301a; font-size: 16px; font-weight: 800; }
  .btn-sec { border: 2px solid #111; border-radius: 999px; padding: 12px 18px; background: #fff; color: #111; font-size: 15px; font-weight: 700; }
  .soy { text-align: center; margin-top: 18px; }
  .soy button { border: 0; background: none; color: #aaa; font-size: 12px; text-decoration: underline; }
  .hoja { position: fixed; inset: 0; background: rgba(0, 0, 0, .55); display: grid; place-items: end center; z-index: 10; }
  .hoja[hidden], .tienda[hidden], .soy[hidden] { display: none; }
  .hoja-caja { width: min(560px, 100%); max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 20px 20px 0 0; padding: 20px 16px 24px; display: grid; gap: 12px; }
  .hoja-caja h2 { font-size: 20px; font-weight: 800; text-align: center; }
  .hoja-caja textarea { width: 100%; font: inherit; font-size: 14px; line-height: 1.45; border: 1.5px solid #ccc; border-radius: 12px; padding: 10px; resize: vertical; }
  .fila { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  details { border: 1.5px solid #e2e2e2; border-radius: 12px; padding: 10px 12px; }
  summary { font-weight: 700; cursor: pointer; }
  details[open] { display: grid; gap: 8px; }
  .nota { font-size: 12px; color: #666; }
  .cerrar { border: 0; background: none; color: #666; text-decoration: underline; font-size: 14px; justify-self: center; }
  .copiado { text-align: center; font-size: 13px; font-weight: 700; color: #138a3e; min-height: 1em; }
  @media (min-width: 600px) { .hoja { place-items: center; } .hoja-caja { border-radius: 20px; } }
</style>
</head><body>
<main class="orden">
  <header class="cab"><img src="/img/logo-lobo-256.png" alt="Lobo de Lujo"><h1>NUEVA ORDEN</h1></header>
  <section class="prendas${orden.items.length === 1 ? " una" : ""}">${prendas}</section>
  <section class="tabla"><span class="t">Cantidad</span><span class="t">Producto</span><span class="t">Precio unitario</span>${filas}</section>
  <section class="totales">
    <span class="n">Subtotal</span><span class="v">${precio(subtotal)}</span>
    <span class="n">${esc(lineaEnvio[0])}</span><span class="v">${esc(lineaEnvio[1])}</span>
    <span class="raya"></span>
  </section>
  <div class="total"><b>TOTAL</b><strong>${precio(total)}</strong></div>
  <footer class="pie"><span>${numero ? `Orden #${esc(numero)}` : ""}</span><span>${esc(fecha)}</span><span>lobodelujo.cl</span></footer>
</main>

<!-- Solo para Lobo de Lujo: aparece en el celular donde se entró al panel (o al tocar "Soy Lobo de Lujo" una vez) -->
<section class="tienda" id="tienda" hidden>
  <p class="solo">Solo para Lobo de Lujo 🐺</p>
  <button class="btn-ok" id="disponible">✅ Disponible · responder al cliente</button>
</section>
<p class="soy"><button id="soy">Soy Lobo de Lujo</button></p>
<div class="hoja" id="hoja" hidden>
  <div class="hoja-caja" role="dialog" aria-modal="true" aria-labelledby="hoja-titulo">
    <h2 id="hoja-titulo">Respuesta para el cliente</h2>
    <textarea id="respuesta" rows="13"></textarea>
    <div class="fila"><button class="btn-ok" id="enviar">📲 Enviar por WhatsApp</button><button class="btn-sec" id="copiar">📋 Copiar</button></div>
    <p class="copiado" id="copiado"></p>
    <details id="caja-datos">
      <summary>🏦 Tus datos para transferir</summary>
      <p class="nota">Se guardan solo en este celular (no quedan en la web) y se agregan solos a cada respuesta.</p>
      <textarea id="datos" rows="6" placeholder="Nombre&#10;RUT&#10;Banco&#10;Tipo de cuenta&#10;Número de cuenta&#10;Correo"></textarea>
      <button class="btn-sec" id="guardar">Guardar datos</button>
    </details>
    <button class="cerrar" id="cerrar">Cerrar</button>
  </div>
</div>
<script type="application/json" id="orden-datos">${JSON.stringify({
    items: orden.items.map((i) => ({ nombre: i.nombre, talla: i.talla, color: i.color, cant: i.cant, precio: i.precio })),
    envio: orden.envio, costoEnvio: orden.costoEnvio, subtotal, total, numero,
  }).replace(/</g, "\\u003c")}</script>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const O = JSON.parse($("orden-datos").textContent);
  const fmt = (n) => "$" + String(Math.round(Number(n) || 0)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const CLAVE_DATOS = "lobo-datos-transferencia";

  // En el celular de la tienda (entró al panel en esta web, o tocó "Soy Lobo de Lujo") se ven los botones
  const mostrar = () => { $("tienda").hidden = false; $("soy").parentNode.hidden = true; };
  if (leer("lobo-tienda") === "1" || leer("decap-cms-user") || leer("netlify-cms-user")) mostrar();
  $("soy").onclick = () => { guardar("lobo-tienda", "1"); mostrar(); };

  function respuesta() {
    const lineas = O.items.map((i) => {
      const d = [i.talla && "Talla " + i.talla, i.color && "Color " + i.color.toLowerCase()].filter(Boolean).join(" · ");
      return "• " + i.cant + "x " + i.nombre + (d ? " (" + d + ")" : "") + " – " + fmt(i.precio * i.cant);
    }).join("\\n");
    const montos = O.envio === "a"
      ? "Subtotal: " + fmt(O.subtotal) + "\\nEnvío: " + fmt(O.costoEnvio) + "\\n*Total a pagar: " + fmt(O.total) + "*"
      : O.envio === "r"
        ? "*Total a pagar: " + fmt(O.total) + "*\\nEnvío: por pagar al recibir 📦"
        : "*Total a pagar: " + fmt(O.total) + "*\\nEntrega: delivery gratis en Antofagasta 🛵";
    const datos = (leer(CLAVE_DATOS) || "").trim();
    const pago = datos
      ? "Para confirmar tu compra, transfiere el total a:\\n" + datos
      : "Para confirmar tu compra, te envío los datos para transferir 👇";
    const fin = O.envio === "x"
      ? "Envíame el comprobante y tu dirección para coordinar la entrega 🛵"
      : "Envíame el comprobante y tus datos de envío: nombre, RUT, teléfono, dirección y comuna 📦";
    return "¡Hola! 🐺 Sí, tenemos disponible tu pedido ✅\\n\\n" + lineas + "\\n\\n" + montos + "\\n\\n" + pago + "\\n\\n" + fin +
      (O.numero ? "\\n\\nOrden #" + O.numero : "");
  }

  const abrir = () => {
    $("respuesta").value = respuesta();
    $("datos").value = leer(CLAVE_DATOS) || "";
    $("caja-datos").open = !$("datos").value;
    $("copiado").textContent = "";
    $("hoja").hidden = false;
  };
  $("disponible").onclick = abrir;
  $("cerrar").onclick = () => { $("hoja").hidden = true; };
  $("hoja").onclick = (e) => { if (e.target === $("hoja")) $("hoja").hidden = true; };
  $("guardar").onclick = () => {
    guardar(CLAVE_DATOS, $("datos").value.trim());
    $("respuesta").value = respuesta();
    $("caja-datos").open = false;
    $("copiado").textContent = "Datos guardados en este celular ✅";
  };
  // WhatsApp abre la lista de chats: eliges al cliente (sale arriba, porque te acaba de escribir)
  $("enviar").onclick = () => { window.open("https://wa.me/?text=" + encodeURIComponent($("respuesta").value), "_blank"); };
  $("copiar").onclick = async () => {
    const t = $("respuesta").value;
    let ok = false;
    try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {
      $("respuesta").select();
      try { ok = document.execCommand("copy"); } catch (e2) {}
    }
    $("copiado").textContent = ok ? "Copiado ✅ Vuelve al chat del cliente y pégalo" : "Mantén presionado el texto para copiarlo";
  };
})();
</script>
</body></html>`);
}
