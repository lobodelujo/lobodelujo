// Buscador de la lista de productos del panel: escribes una marca (o categoría, o precio) y la lista muestra
// solo esas prendas. Solo esconde las filas en pantalla: no cambia nada de los productos ni de su orden.
// Cada fila tiene un resumen "NOMBRE · $PRECIO · Categoría" (config.yml); el buscador compara contra ese texto.
(function () {
  var texto = "";
  var normal = function (s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  };
  var enProductos = function () { return /\/entries\/productos/.test(location.hash); };

  // Caja del buscador (fija arriba, solo en la página de productos)
  var caja = document.createElement("div");
  caja.id = "buscador-panel";
  caja.hidden = true;
  caja.innerHTML =
    '<span class="bp-lupa">🔍</span>' +
    '<input type="search" placeholder="Buscar prenda: marca, categoría o precio" aria-label="Buscar prenda" autocomplete="off">' +
    '<span class="bp-cuenta"></span>' +
    '<button type="button" class="bp-limpiar" aria-label="Borrar búsqueda" hidden>×</button>';
  var estilo = document.createElement("style");
  estilo.textContent =
    // Abajo al centro, flotando: arriba está la barra del panel con el botón Publicar y no hay que taparla
    "#buscador-panel{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:99997;display:flex;align-items:center;gap:8px;" +
    "width:min(560px,calc(100% - 24px));padding:8px 10px 8px 14px;border-radius:999px;background:#0b0b0c;box-shadow:0 6px 22px rgba(0,0,0,.4);" +
    "border:1px solid #fad02c}" +
    "#buscador-panel[hidden]{display:none}" +
    "#buscador-panel input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#fff;font:16px system-ui,sans-serif}" +
    "#buscador-panel input::placeholder{color:#9a978f}" +
    ".bp-cuenta{color:#fad02c;font:600 13px system-ui,sans-serif;white-space:nowrap}" +
    ".bp-limpiar{border:0;background:#26262a;color:#fff;width:28px;height:28px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer}" +
    ".bp-limpiar[hidden]{display:none}" +
    // El botón "Instalar panel" (abajo a la izquierda) sube para no quedar debajo del buscador
    "body.con-buscador-panel #instalar-panel{bottom:74px}body.con-buscador-panel #pasos-panel{bottom:124px}";
  var poner = function () {
    if (!caja.parentNode && document.body) { document.head.appendChild(estilo); document.body.appendChild(caja); }
  };
  var input = caja.querySelector("input"), cuenta = caja.querySelector(".bp-cuenta"), limpiar = caja.querySelector(".bp-limpiar");

  // Las filas: el elemento con el resumen "· $" y, subiendo, el bloque que es hermano de los otros productos
  var filas = function () {
    var res = [];
    var andador = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (caja.contains(n)) return NodeFilter.FILTER_SKIP;
        // Tolera espacios de más (un nombre escrito "OFF WHITE " con espacio al final) y un precio vacío
        return /\S\s*·\s*\$\d*\s*·\s*\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var resumenes = [];
    while (andador.nextNode()) resumenes.push(andador.currentNode.parentElement);
    if (resumenes.length < 2) return res;
    // El contenedor común más cercano de todos los resúmenes es la lista; cada fila es su hijo directo
    var lista = resumenes[0].parentElement;
    while (lista && !resumenes.every(function (r) { return lista.contains(r); })) lista = lista.parentElement;
    if (!lista) return res;
    resumenes.forEach(function (r) {
      var fila = r;
      while (fila.parentElement && fila.parentElement !== lista) fila = fila.parentElement;
      res.push({ fila: fila, texto: normal(r.textContent) });
    });
    return res;
  };

  var filtrar = function () {
    var q = normal(texto);
    var partes = q ? q.split(" ") : [];
    var todas = filas(), vistas = 0;
    todas.forEach(function (f) {
      var ok = partes.every(function (p) { return f.texto.indexOf(p) >= 0; });
      // Una prenda que estás editando (abierta) nunca se esconde
      if (!ok && f.fila.querySelector("input:focus, textarea:focus")) ok = true;
      var display = ok ? "" : "none";
      if (f.fila.style.display !== display) f.fila.style.display = display;
      if (ok) vistas++;
    });
    cuenta.textContent = q && todas.length ? vistas + " de " + todas.length : "";
    limpiar.hidden = !q;
  };

  var mostrar = function () {
    poner();
    // Solo cuando ya se ve la lista (no en la pantalla de "Iniciar sesión")
    var si = enProductos() && filas().length > 0;
    caja.hidden = !si;
    document.body.classList.toggle("con-buscador-panel", si);
    if (si) filtrar();
  };

  input.addEventListener("input", function () { texto = input.value; filtrar(); });
  limpiar.addEventListener("click", function () { texto = ""; input.value = ""; filtrar(); input.focus(); });
  addEventListener("hashchange", mostrar);

  // El panel dibuja la lista de a poco y la vuelve a dibujar al editar: se reaplica el filtro
  var pendiente = false;
  new MutationObserver(function () {
    if (pendiente) return;
    pendiente = true;
    setTimeout(function () {
      pendiente = false;
      if (enProductos()) { if (caja.hidden) mostrar(); else if (texto) filtrar(); else if (!filas().length) mostrar(); }
      else if (!caja.hidden) mostrar();
    }, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrar); else mostrar();
})();
