// Orden con link corto: lobodelujo.cl/orden/K6CT0
// La orden se guardó en el almacén ORDENES (functions/api/orden.js) y se dibuja igual que el link largo.
import { pintarOrden, paginaAviso } from "../orden.js";

export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const codigo = String(params.codigo || "").toUpperCase();
  if (!/^[0-9A-Z]{4,10}$/.test(codigo)) return paginaAviso("Este link de orden no es válido.");
  if (!env.ORDENES) return paginaAviso("No se pudo abrir la orden en este momento. Intenta de nuevo en un rato.", 503);

  const d = await env.ORDENES.get(codigo);
  if (!d) {
    // Recién creada puede tardar unos segundos en llegar a todos lados: se recarga sola un par de veces
    const intento = Number(url.searchParams.get("r") || 0);
    if (intento < 4) {
      const otra = `${url.pathname}?r=${intento + 1}`;
      return paginaAviso("Cargando la orden… 🐺", 404, `<meta http-equiv="refresh" content="4; url=${otra}">`);
    }
    return paginaAviso("No encontramos esta orden. Puede que el link esté incompleto o que la orden tenga más de 6 meses.", 404);
  }
  return pintarOrden(d, { origin: url.origin, env, codigo });
}
