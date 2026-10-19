// Inicio de sesión del panel (/admin) con GitHub, directo desde Cloudflare (sin Netlify).
// Paso 1: manda a GitHub a pedir permiso. Usa las variables GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET
// configuradas en Cloudflare Pages → Configuración → Variables y secretos.
export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Falta configurar GITHUB_CLIENT_ID en Cloudflare.", { status: 500 });
  }
  const url = new URL(request.url);
  const estado = crypto.randomUUID();
  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  github.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
  github.searchParams.set("scope", "repo,user");
  github.searchParams.set("state", estado);
  return new Response(null, {
    status: 302,
    headers: {
      Location: github.toString(),
      "Set-Cookie": `oauth_estado=${estado}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
