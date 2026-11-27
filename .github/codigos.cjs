// Código de cada prenda (GO-007, PL-014…). Lo ejecuta .github/workflows/minis.yml cada vez que cambia el catálogo.
// Cada prenda nueva recibe las 2 letras de su categoría + el número siguiente. Un número usado no se repite nunca,
// ni siquiera si la prenda se vende y se borra.
// Los códigos se guardan en datos/codigos.json, aparte de productos.json, para no chocar con el panel mientras se edita:
//   { "ultimo": { "GO": 7, ... }, "codigos": { "img/productos/<foto>": "GO-007", ... } }
// Una prenda se reconoce por sus fotos: si cualquiera de sus fotos ya tiene código, conserva ese código
// (aunque se cambie el nombre, el precio, el orden o la foto de portada).
const fs = require("fs");

const LETRAS = { poleras: "PL", polerones: "PN", gorras: "GO", shorts: "SH", accesorios: "AC", lentes: "LE", pantalones: "PA" };
const letras = (cat) => {
  const c = String(cat || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return LETRAS[c] || (c.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase().padEnd(2, "X"));
};
const lista = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => String(x ?? "").trim().replace(/^\//, "")).filter(Boolean);

try {
  const productos = (JSON.parse(fs.readFileSync("datos/productos.json", "utf8")).productos || []).filter((p) => p && p.nombre);
  let guardado = { ultimo: {}, codigos: {} };
  try { guardado = JSON.parse(fs.readFileSync("datos/codigos.json", "utf8")); } catch {}
  const ultimo = { ...(guardado.ultimo || {}) };
  const viejos = guardado.codigos || {};
  const codigos = {}, usados = new Set();
  let nuevos = 0;
  // Los números ya usados (incluso de prendas vendidas) no se vuelven a dar
  for (const c of Object.values(viejos)) {
    const m = String(c).match(/^([A-Z]{2})-(\d+)$/);
    if (m) ultimo[m[1]] = Math.max(ultimo[m[1]] || 0, Number(m[2]));
  }

  // De la más antigua a la más nueva (el panel agrega las nuevas arriba), así los números siguen el orden de llegada
  for (const p of productos.slice().reverse()) {
    const fotos = lista(p.fotos);
    if (!fotos.length) continue;
    let cod = fotos.map((f) => viejos[f]).find(Boolean);
    // Dos prendas con la misma foto (una copia): la segunda recibe su propio código
    if (cod && usados.has(cod)) cod = "";
    if (!cod) {
      const l = letras(p.categoria);
      ultimo[l] = (ultimo[l] || 0) + 1;
      cod = `${l}-${String(ultimo[l]).padStart(3, "0")}`;
      nuevos++;
    }
    usados.add(cod);
    for (const f of fotos) if (!codigos[f]) codigos[f] = cod;
  }

  // Se recuerdan también los de prendas que ya no están: si una vuelve al catálogo, recupera su mismo código
  for (const f of Object.keys(viejos)) if (!codigos[f]) codigos[f] = viejos[f];

  const texto = JSON.stringify({ ultimo, codigos }, null, 1) + "\n";
  let antes = "";
  try { antes = fs.readFileSync("datos/codigos.json", "utf8"); } catch {}
  if (texto !== antes) fs.writeFileSync("datos/codigos.json", texto);
  console.log(`Prendas: ${productos.length} · códigos nuevos: ${nuevos}`);
} catch (e) {
  // Si algo falla, el catálogo sigue igual (sin códigos nuevos)
  console.log("No se pudieron poner los códigos:", e.message);
}
