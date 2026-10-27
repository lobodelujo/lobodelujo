// Link de cada prenda: /p/nombre-de-la-prenda
// WhatsApp, Instagram y Facebook leen aquí la foto, el nombre y el precio para mostrar la vista previa.
// Las personas son llevadas al tiro a la ficha del producto en el catálogo (/#producto=...).

// Igual que en cargar.js, para que los nombres de los links coincidan
const slug = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const id = String(params.id || "");
  const destino = `${url.origin}/#producto=${encodeURIComponent(id)}`;

  let p = null;
  try {
    const r = await env.ASSETS.fetch(new URL("/datos/productos.json", url.origin));
    const datos = await r.json();
    // Igual que en cargar.js: con nombre repetido, el link lleva el código de la foto 1; el link de antes
    // (nombre-2, nombre-3… según el orden) también se acepta
    const crudos = (datos.productos || []).filter((x) => x && x.nombre);
    const veces = {};
    for (const x of crudos) { const b = slug(x.nombre) || "producto"; veces[b] = (veces[b] || 0) + 1; }
    const usados = new Set(), viejos = new Set();
    let viejo = null;
    for (const x of crudos) {
      const base = slug(x.nombre) || "producto";
      const nuevo = unico(usados, veces[base] > 1 ? [base, codigoFoto(x)].filter(Boolean).join("-") : base);
      if (nuevo === id) { p = x; break; }
      if (!viejo && unico(viejos, base) === id) viejo = x;
    }
    if (!p) p = viejo;
  } catch {}

  const titulo = p ? `${p.nombre} · ${precio(p.precio)}` : "Lobo de Lujo 🐺";
  const descripcion = p
    ? [p.descripcion, (p.tallas || []).length ? `Tallas: ${p.tallas.join(", ")}` : ""].filter(Boolean).join(" · ") || "Lobo de Lujo · Envíos a todo Chile"
    : "Moda urbana con envíos a todo Chile";
  const fotoRel = p && (p.fotos || [])[0];
  const imagen = fotoRel ? new URL(String(fotoRel).replace(/^\//, ""), url.origin + "/").href : `${url.origin}/img/compartir.jpg`;

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Lobo de Lujo</title>
<meta property="og:type" content="product">
<meta property="og:site_name" content="Lobo de Lujo">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:image" content="${esc(imagen)}">
<meta property="og:url" content="${esc(url.href)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
<style>body{margin:0;background:#0b0b0c;color:#f4f1ea;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}img{max-width:260px;border-radius:12px}a{color:#fad02c}</style>
</head><body>
<div><img src="${esc(imagen)}" alt=""><p>${esc(titulo)}</p><p><a href="${esc(destino)}">Ver en el catálogo</a></p></div>
<script>location.replace(${JSON.stringify(destino).replace(/</g, "\\u003c")});</script>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
