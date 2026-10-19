// Carga los datos que se editan desde el panel (/admin) y después arranca el catálogo (app.js)

const ORDEN_LETRAS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL"];
function ordenarTallas(a, b) {
  const ia = ORDEN_LETRAS.indexOf(a.toUpperCase()), ib = ORDEN_LETRAS.indexOf(b.toUpperCase());
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b, "es");
}

// Solo en Netlify las fotos se achican solas (Image CDN); en Cloudflare u otro hosting se usan tal cual
const EN_NETLIFY = location.hostname.endsWith(".netlify.app");
function foto(src, ancho) {
  if (!src || !EN_NETLIFY || /^(https?:|data:)/.test(src)) return src;
  return `/.netlify/images?url=/${encodeURIComponent(src.replace(/^\//, ""))}&w=${ancho}&q=80`;
}

const lista = (v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
const slug = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

(async () => {
  try {
    const leer = (url) => fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
    const [tienda, datos] = await Promise.all([leer("datos/tienda.json"), leer("datos/productos.json")]);

    window.TIENDA = { ...tienda, whatsapp: (tienda.whatsapp || []).filter((n) => n && n.numero) };
    const usados = new Set();
    window.PRODUCTOS = (datos.productos || [])
      .filter((p) => p && p.nombre)
      .map((p) => {
        const base = slug(p.nombre) || "producto";
        let id = base, n = 2;
        while (usados.has(id)) id = `${base}-${n++}`;
        usados.add(id);
        return {
          id,
          nombre: p.nombre,
          categoria: p.categoria || "Otros",
          precio: Number(p.precio) || 0,
          precioAntes: Number(p.precioAntes) > 0 ? Number(p.precioAntes) : null,
          etiqueta: p.etiqueta || "",
          disponible: p.disponible !== false,
          descripcion: p.descripcion || "",
          tallas: lista(p.tallas).sort(ordenarTallas),
          colores: lista(p.colores),
          fotos: lista(p.fotos),
        };
      });
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
