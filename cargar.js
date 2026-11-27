// Carga los datos que se editan desde el panel (/admin) y después arranca el catálogo (app.js)

// Instalar como app: el teléfono avisa que se puede instalar apenas abre la página, antes de que cargue app.js.
// Se guarda el aviso para que el botón "Descargar aplicación" abra la instalación con un solo toque.
window.instalacionApp = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.instalacionApp = e;
  document.dispatchEvent(new Event("app-instalable"));
});

const ORDEN_LETRAS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL"];
function ordenarTallas(a, b) {
  const ia = ORDEN_LETRAS.indexOf(a.toUpperCase()), ib = ORDEN_LETRAS.indexOf(b.toUpperCase());
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b, "es");
}

// Fotos livianas: un robot de GitHub (.github/workflows/minis.yml) guarda en img/mini una copia chica de cada
// foto (560 px de ancho, WebP) para las tarjetas y, de cada PNG, una copia WebP del mismo tamaño. La foto grande
// de la ficha y la del zoom siguen siendo el archivo original, así no se pierde calidad.
// datos/minis.json dice qué copias existen: una foto recién subida se ve con su archivo original hasta que el
// robot termina (1 o 2 minutos), y si el robot falla todo sigue funcionando como antes.
let MINIS = new Set(), GRANDES = new Set();
function foto(src, ancho) {
  if (!src || /^(https?:|data:)/.test(src)) return src;
  const limpio = src.replace(/^\//, "");
  const copia = "img/mini/" + limpio.split("/").pop().replace(/\.[^.]+$/, "");
  if (ancho <= 600 && MINIS.has(limpio)) return copia + ".webp";
  if (ancho < 2000 && GRANDES.has(limpio)) return copia + "-g.webp";
  return src;
}

const lista = (v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
const slug = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Link de cada producto: su nombre. Si otro se llama igual, se le suma el código de su foto 1 (lo pone el panel al
// subirla), así el link no cambia al reordenar la lista ni al subir otro con el mismo nombre.
// idViejo es el link de antes (nombre-2, nombre-3… según el orden), para que los que ya se mandaron sigan abriendo.
// functions/p/[id].js hace lo mismo para la vista previa de WhatsApp.
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

// Descuentos por fecha (Black Friday, etc.): "⚙️ Datos de la tienda > Descuentos" en el panel (datos/tienda.json).
// Cada uno tiene categorías, porcentaje y desde/hasta en hora de Chile ("2026-11-27 00:00"; "hasta" no se incluye).
// Solo cambia el precio que se ve: el de antes queda tachado. No toca productos.json, así que al terminar
// todo vuelve solo a los precios normales. functions/orden.js usa la misma regla para revisar las órdenes.
const horaChile = (d = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(d).replace("T", " ");
const fechaDesc = (s) => String(s || "").trim().replace("T", " ").slice(0, 16);
function descuentosActivos(ahora = horaChile()) {
  return (window.TIENDA.descuentos || []).filter((d) => {
    const pct = Number(d && d.porcentaje);
    return pct > 0 && pct < 100 && fechaDesc(d.desde) <= ahora && ahora < fechaDesc(d.hasta);
  });
}
function aplicarDescuentos() {
  const activos = descuentosActivos();
  window.DESCUENTOS_ACTIVOS = activos;
  for (const p of window.PRODUCTOS) {
    const d = activos.find((x) => lista(x.categorias).some((c) => c.toLowerCase() === p.categoria.toLowerCase()));
    if (!d || !p.precio) continue;
    const pct = Number(d.porcentaje);
    p.precioAntes = Math.max(p.precioAntes || 0, p.precio);
    p.precio = Math.round((p.precio * (100 - pct)) / 100 / 10) * 10;
    p.descuento = { porcentaje: pct, nombre: String(d.nombre || "").trim() };
  }
  // Cuando un descuento empieza o termina, la página se recarga sola (o apenas el cliente vuelve a ella)
  const ahora = Date.now();
  const cambios = (window.TIENDA.descuentos || []).flatMap((d) => [d.desde, d.hasta]).map((s) => {
    const f = fechaDesc(s);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(f)) return 0;
    // Hora de Chile -> momento exacto (se prueba con -3 y -4 h, según horario de verano o invierno)
    for (const off of ["-03:00", "-04:00"]) {
      const t = Date.parse(f.replace(" ", "T") + ":00" + off);
      if (horaChile(new Date(t)) === f) return t;
    }
    return 0;
  }).filter((t) => t > ahora && t - ahora < 2 * 864e5);
  if (cambios.length) {
    const espera = Math.min(...cambios) - ahora + 1500;
    setTimeout(() => {
      if (!document.hidden) location.reload();
      else document.addEventListener("visibilitychange", () => location.reload(), { once: true });
    }, espera);
  }
}

(async () => {
  try {
    const leer = (url) => fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
    const [tienda, datos, minis, cods] = await Promise.all([
      leer("datos/tienda.json"),
      leer("datos/productos.json"),
      leer("datos/minis.json").catch(() => null), // si todavía no existe, se usan las fotos originales
      leer("datos/codigos.json").catch(() => null), // código de cada prenda (lo pone el robot, .github/codigos.cjs)
    ]);
    if (minis) { MINIS = new Set(minis.m || []); GRANDES = new Set(minis.g || []); }
    const CODIGOS = (cods && cods.codigos) || {};
    // Prenda recién subida: no tiene código hasta que el robot termina (1 o 2 minutos) y en la ficha no sale nada
    const codigoDe = (p) => lista(p.fotos).map((f) => CODIGOS[f.replace(/^\//, "")]).find(Boolean) || "";

    window.TIENDA = { ...tienda, whatsapp: (tienda.whatsapp || []).filter((n) => n && n.numero) };
    const crudos = (datos.productos || []).filter((p) => p && p.nombre);
    const veces = {};
    for (const p of crudos) { const b = slug(p.nombre) || "producto"; veces[b] = (veces[b] || 0) + 1; }
    const usados = new Set(), viejos = new Set();
    window.PRODUCTOS = crudos
      .map((p) => {
        const base = slug(p.nombre) || "producto";
        return {
          id: unico(usados, veces[base] > 1 ? [base, codigoFoto(p)].filter(Boolean).join("-") : base),
          idViejo: unico(viejos, base),
          nombre: p.nombre,
          codigo: codigoDe(p),
          categoria: p.categoria || "Otros",
          precio: Number(p.precio) || 0,
          precioAntes: Number(p.precioAntes) > 0 ? Number(p.precioAntes) : null,
          etiqueta: p.etiqueta || "",
          disponible: p.disponible !== false,
          perchero: p.perchero === true,
          fotoPercheroLado: p.fotoPercheroLado || "",
          fotoPerchero: p.fotoPerchero || "",
          fotoPercheroEspalda: p.fotoPercheroEspalda || "",
          vitrina: p.vitrina === true,
          fotoVitrina: p.fotoVitrina || "",
          descripcion: p.descripcion || "",
          tallas: lista(p.tallas).sort(ordenarTallas),
          fotoMedidas: p.fotoMedidas || "",
          // Fotos de medidas sueltas, una por talla (panel: "Más fotos de medidas")
          medidasTallas: (Array.isArray(p.medidasTallas) ? p.medidasTallas : [])
            .filter((m) => m && m.foto)
            .map((m) => ({ talla: String(m.talla ?? "").trim(), foto: m.foto }))
            .sort((a, b) => ordenarTallas(a.talla, b.talla)),
          colores: lista(p.colores),
          fotos: lista(p.fotos),
        };
      });
    aplicarDescuentos();
  } catch (e) {
    console.error(e);
    document.getElementById("editorial").innerHTML =
      `<p class="vacio">No se pudo cargar el catálogo 🐺 Recarga la página.</p>`;
    return;
  }
  const s = document.createElement("script");
  s.src = "app.js";
  document.body.appendChild(s);
})();
