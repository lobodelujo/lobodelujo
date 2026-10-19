// Inicio de sesión del panel (/admin) con GitHub · Paso 2: GitHub vuelve aquí con un código,
// se cambia por el permiso de acceso y se le entrega al panel (Decap CMS) que abrió esta ventana.
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("code");
  const estado = url.searchParams.get("state");
  const cookie = (request.headers.get("Cookie") || "").match(/oauth_estado=([^;]+)/);

  let resultado = "error";
  let contenido = { error: "La sesión expiró. Cierra esta ventana e intenta de nuevo." };

  if (codigo && estado && cookie && cookie[1] === estado) {
    const respuesta = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "lobodelujo-panel" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: codigo,
        redirect_uri: `${url.origin}/api/callback`,
      }),
    });
    const datos = await respuesta.json();
    if (datos.access_token) {
      resultado = "success";
      contenido = { token: datos.access_token, provider: "github" };
    } else {
      contenido = { error: datos.error_description || datos.error || "GitHub no entregó el permiso." };
    }
  }

  // Protocolo de Decap CMS: avisar "authorizing", esperar respuesta del panel y enviar el resultado
  const mensaje = `authorization:github:${resultado}:${JSON.stringify(contenido)}`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Panel Lobo de Lujo</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px">
<p>${resultado === "success" ? "✅ Sesión iniciada. Esta ventana se cierra sola." : "❌ No se pudo iniciar sesión. Cierra esta ventana e intenta de nuevo."}</p>
<script>
  (function () {
    var origen = ${JSON.stringify(url.origin)};
    var mensaje = ${JSON.stringify(mensaje).replace(/</g, "\\u003c")};
    function recibir(e) {
      if (e.origin !== origen) return;
      window.removeEventListener("message", recibir);
      window.opener.postMessage(mensaje, origen);
      setTimeout(function () { window.close(); }, 400);
    }
    if (window.opener) {
      window.addEventListener("message", recibir);
      window.opener.postMessage("authorizing:github", origen);
    }
  })();
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "oauth_estado=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
