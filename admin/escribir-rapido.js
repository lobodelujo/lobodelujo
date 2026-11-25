// Escritura fluida en el panel. El panel vuelve a dibujar TODAS las prendas con cada letra (más de medio segundo
// por letra con 87 prendas). Aquí las letras quedan en la casilla al instante y el panel se entera una sola vez:
// cuando hay una pausa al escribir, o ANTES si se toca cualquier cosa (Publicar, otra casilla, Enter, salir).
(function () {
  var PAUSA = 700;
  var pendiente = null; // { el, valor, reloj }

  var enEdicion = function () { return /\/entries\/|\/new/.test(location.hash); };
  var sirve = function (el) {
    if (!el || !enEdicion()) return false;
    if (el.closest && el.closest("#buscador-panel")) return false;
    if (el.nodeName === "TEXTAREA") return true;
    if (el.nodeName !== "INPUT" || !/^(text|number|)$/.test(el.getAttribute("type") || "")) return false;
    // Los menús desplegables (categoría, tallas, etiqueta) filtran mientras se escribe: esos no se tocan
    return !(el.getAttribute("aria-autocomplete") || el.getAttribute("role") === "combobox" || /^react-select/.test(el.id));
  };
  // Escribe el valor en la casilla sin que el panel lo dé por visto
  var ponerValor = function (el, v) {
    var p = el.nodeName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var a = null, b = null;
    try { a = el.selectionStart; b = el.selectionEnd; } catch (e) {}
    Object.getOwnPropertyDescriptor(p, "value").set.call(el, v);
    try { if (a !== null) el.setSelectionRange(a, b); } catch (e) {}
  };

  // Le entrega al panel lo que está en espera
  var entregar = function () {
    if (!pendiente) return;
    var p = pendiente;
    pendiente = null;
    clearTimeout(p.reloj);
    if (!p.el.isConnected) return;
    if (p.el.value !== p.valor) ponerValor(p.el, p.valor);
    var ev = new Event("input", { bubbles: true });
    ev.loboListo = true;
    p.el.dispatchEvent(ev);
  };

  window.addEventListener("input", function (e) {
    var el = e.target;
    if (e.loboListo || !sirve(el)) return;
    if (pendiente && pendiente.el !== el) entregar();
    e.stopImmediatePropagation();
    if (pendiente) clearTimeout(pendiente.reloj);
    var cursor = null;
    try { cursor = el.selectionStart; } catch (x) {} // las casillas de precio no informan el cursor
    pendiente = { el: el, valor: el.value, cursor: cursor, reloj: setTimeout(entregar, PAUSA) };
  }, true);

  // Si el panel redibujó la casilla con el texto anterior mientras había letras en espera, se recuperan
  window.addEventListener("beforeinput", function (e) {
    if (pendiente && pendiente.el === e.target && e.target.value !== pendiente.valor) {
      ponerValor(e.target, pendiente.valor);
      try { if (pendiente.cursor !== null) e.target.setSelectionRange(pendiente.cursor, pendiente.cursor); } catch (x) {}
    }
  }, true);

  // Antes de cualquier otra acción, lo escrito ya tiene que estar entregado
  var fuera = function (e) { if (pendiente && e.target !== pendiente.el) entregar(); };
  ["pointerdown", "mousedown", "touchstart", "click"].forEach(function (t) { window.addEventListener(t, fuera, true); });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.nodeName !== "TEXTAREA" || e.key === "Tab" || e.key === "Escape" || ((e.ctrlKey || e.metaKey) && /^s$/i.test(e.key))) entregar();
  }, true);
  window.addEventListener("focusout", function (e) { if (pendiente && e.target === pendiente.el) entregar(); }, true);
  window.addEventListener("hashchange", entregar, true);
  window.addEventListener("beforeunload", entregar, true);
  window.addEventListener("pagehide", entregar, true);
  document.addEventListener("visibilitychange", function () { if (document.hidden) entregar(); }, true);
})();
