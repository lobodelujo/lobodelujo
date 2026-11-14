// La dirección antigua (lobodelujo.pages.dev) lleva siempre a lobodelujo.cl, a la misma página
// (también el panel y los links de cada prenda). Las vistas previas de Cloudflare (xxxx.lobodelujo.pages.dev)
// no se tocan. Es una redirección temporal (302): si algún día se quita este archivo, todo vuelve como antes.
const ANTIGUO = "lobodelujo.pages.dev";
const NUEVO = "https://lobodelujo.cl";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === ANTIGUO) return Response.redirect(NUEVO + url.pathname + url.search, 302);
  return context.next();
}