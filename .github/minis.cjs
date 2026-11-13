// Crea las copias livianas de las fotos del catálogo (lo ejecuta .github/workflows/minis.yml).
//   img/mini/<foto>.webp    copia chica (560 px de ancho) para las tarjetas, el carrito y las miniaturas
//   img/mini/<foto>-g.webp  solo para los PNG: misma medida y transparencia, pero en WebP (pesa mucho menos)
// datos/minis.json le dice al catálogo qué copias existen (cargar.js). Solo se crean las que faltan.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ORIGEN = "img/productos";
const DESTINO = "img/mini";
const ANCHO = 560;

(async () => {
  fs.mkdirSync(DESTINO, { recursive: true });
  const fotos = fs.readdirSync(ORIGEN).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const m = [], g = [], vigentes = new Set();
  let nuevas = 0, antes = 0, despues = 0;

  for (const f of fotos) {
    const base = f.replace(/\.[^.]+$/, "");
    const src = path.join(ORIGEN, f);
    const mini = path.join(DESTINO, base + ".webp");
    const grande = path.join(DESTINO, base + "-g.webp");
    try {
      if (!fs.existsSync(mini)) {
        await sharp(src).rotate().resize({ width: ANCHO, withoutEnlargement: true }).webp({ quality: 84 }).toFile(mini);
        nuevas++;
      }
      // Solo sirve la copia chica si de verdad pesa menos que la original
      if (fs.statSync(mini).size < fs.statSync(src).size) {
        m.push(`${ORIGEN}/${f}`);
        vigentes.add(base + ".webp");
        antes += fs.statSync(src).size;
        despues += fs.statSync(mini).size;
      }
      if (/\.png$/i.test(f)) {
        if (!fs.existsSync(grande)) {
          await sharp(src).rotate().webp({ quality: 92, alphaQuality: 100 }).toFile(grande);
          nuevas++;
        }
        if (fs.statSync(grande).size < fs.statSync(src).size * 0.8) {
          g.push(`${ORIGEN}/${f}`);
          vigentes.add(base + "-g.webp");
        }
      }
    } catch (e) {
      console.log(`No se pudo con ${f}: ${e.message}`);
    }
  }

  // Las copias de fotos que ya se borraron del catálogo (o que no sirven) se eliminan
  let borradas = 0;
  for (const f of fs.readdirSync(DESTINO)) {
    if (f.endsWith(".webp") && !vigentes.has(f)) { fs.unlinkSync(path.join(DESTINO, f)); borradas++; }
  }

  fs.writeFileSync("datos/minis.json", JSON.stringify({ m, g }) + "\n");
  const mb = (n) => (n / 1048576).toFixed(1) + " MB";
  console.log(`Fotos: ${fotos.length} · copias nuevas: ${nuevas} · borradas: ${borradas}`);
  console.log(`Tarjetas: ${mb(antes)} -> ${mb(despues)} · PNG convertidos: ${g.length}`);
})().catch((e) => {
  // Pase lo que pase, el robot no debe dejar el catálogo a medias
  console.log("Error general:", e.message);
  process.exit(0);
});
