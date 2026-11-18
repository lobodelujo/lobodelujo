// Guarda una orden del carrito y devuelve su código corto (lobodelujo.cl/orden/K6CT0)
// El carrito (app.js > linkOrden) manda { d } con la orden ya armada; si esto falla, el carrito usa el link largo.
// Almacén: Workers KV "lobo-ordenes", conectado al proyecto de Pages con el nombre ORDENES.
import { leerOrden } from "../orden.js";

const LETRAS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0/O ni 1/I/L para que no se confundan
const DURA = 180 * 24 * 60 * 60; // 6 meses; después se borra sola

const json = (obj, estado = 200) =>
  new Response(JSON.stringify(obj), { status: estado, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function codigoNuevo(largo = 5) {
  const azar = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(azar, (n) => LETRAS[n % LETRAS.length]).join("");
}

export async function onRequestPost({ request, env }) {
  if (!env.ORDENES) return json({ error: "sin almacén" }, 503);
  // Solo desde la propia página
  const origen = request.headers.get("Origin");
  if (origen && origen !== new URL(request.url).origin) return json({ error: "origen" }, 403);

  let d;
  try {
    const cuerpo = await request.json();
    d = String(cuerpo && cuerpo.d || "");
    if (!d || d.length > 8000 || !/^[A-Za-z0-9_-]+$/.test(d)) throw new Error("formato");
    leerOrden(d); // que sea una orden de verdad
  } catch {
    return json({ error: "orden no válida" }, 400);
  }

  for (let intento = 0; intento < 4; intento++) {
    const codigo = codigoNuevo(intento < 3 ? 5 : 7);
    if (await env.ORDENES.get(codigo)) continue;
    await env.ORDENES.put(codigo, d, { expirationTtl: DURA });
    return json({ codigo });
  }
  return json({ error: "sin código" }, 500);
}
