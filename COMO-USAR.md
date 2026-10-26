# Catálogo Lobo de Lujo · Guía

- 🌐 **Tu catálogo:** https://lobodelujo.pages.dev
- 🛠️ **Tu panel:** https://lobodelujo.pages.dev/admin

💡 **Tip:** en el celular, abre el panel y usa "Agregar a pantalla de inicio" para tenerlo como una app.

---

# Cómo está armado (ya quedó listo, no hay que tocar nada)

- **GitHub** (repositorio `lobodelujo/lobodelujo`) guarda los archivos del catálogo, las fotos y los datos.
- **Cloudflare Pages** publica el catálogo gratis. Cada vez que publicas algo en el panel, en 1 o 2 minutos aparece en la web.
- **Para entrar al panel** se usa tu cuenta de GitHub: botón **Iniciar sesión con GitHub**.
- ⚠️ Las claves del inicio de sesión (Client ID y Client Secret de GitHub) están guardadas en Cloudflare. **No las compartas con nadie**, tampoco conmigo.

---

# Uso diario desde el celular

Entra a **lobodelujo.pages.dev/admin** → **Catálogo**.

## ➕ Agregar un producto
1. Toca **🛍️ Productos**.
2. Toca **Agregar producto** (aparece arriba de la lista).
3. Completa:
   - **Nombre**
   - **Categoría** (menú)
   - **Precio**: sin puntos ni $, ej: `15990`
   - **Precio anterior**: solo si está en oferta
   - **Etiqueta**: Nuevo, Oferta o Últimas unidades (opcional). Las que tienen **Nuevo** salen primero en "Recién llegados".
   - **¿Hay stock?**: encendido
   - **Descripción**
   - **Tallas**: toca y elige varias
   - **Colores**: separados por coma, ej. `Negro, Blanco`
   - **Fotos**: toca **Agregar foto** → **Elegir una imagen** → **Subir** → elige de la galería. Repite por cada foto (4 o más). **La primera es la portada.**
4. Arriba toca **Publicar** → **Publicar ahora**.
5. En 1 o 2 minutos aparece en la web ✅

## ✏️ Editar (precio, fotos, tallas…)
**🛍️ Productos** → toca el producto en la lista para abrirlo → cambia lo que quieras → **Publicar**.

## 🚫 Marcar como agotado (sin borrarlo)
Abre el producto → apaga **¿Hay stock?** → **Publicar**. Se ve en gris con el botón "Avísame cuando llegue".

## 🗑️ Eliminar un producto
Abre la lista de **🛍️ Productos** → en el producto toca la **✕** de la derecha → **Publicar**.

## ↕️ Cambiar el orden
En la lista, mantén apretado el ícono de arrastrar (≡) de un producto y muévelo. El orden del panel es el orden de la web.

## ⚙️ Cambiar WhatsApp, frase, barra amarilla o categorías
**⚙️ Datos de la tienda** → cambia → **Publicar**.
- **Números de WhatsApp:** puedes tener varios. Si hay más de uno, el cliente elige a quién escribirle.
- **Palabra grande de la portada** y **línea pequeña debajo:** hoy dicen "Presencia" / "primero que todo".
- **Orden de las categorías:** separadas por coma; así aparecen en los botones y en el inicio.

## 🎬 Cambiar el video de portada
**⚙️ Datos de la tienda** → **🎬 Video de portada**:
- **Computador:** MP4 horizontal, **máximo 10 MB**.
- **Celular:** MP4 vertical (opcional; si no hay, usa el del computador).
- **Imagen mientras carga:** opcional.

El video suena al 35% del volumen y el sonido parte con el primer toque del cliente en la pantalla (los navegadores no dejan que suene antes).

## 📸 Foto grande de cada categoría
**⚙️ Datos de la tienda** → **📸 Foto grande de cada categoría** → **Agregar**:
- **Categoría:** elige cuál (Poleras, Polerones…).
- **Foto grande:** horizontal, ideal **1920 × 1080**.
- **Foto para celular:** vertical **1080 × 1350** (opcional).
- Si una categoría no tiene foto, se usa la del primer producto de esa categoría.
- **Accesorios** no lleva foto grande: en su lugar va la vitrina que gira (abajo).

## 💫 La vitrina de Accesorios (accesorios girando en círculo)
En el inicio, en el lugar de Accesorios, los accesorios flotan en un círculo que gira solo. El cliente la gira con el dedo, toca uno para traerlo adelante y lo toca otra vez para verlo grande con su nombre, precio, colores y el botón **Ver y comprar**.
1. Abre el producto (gorra, reloj, cinturón, calcetines, lo que sea) en **🛍️ Productos**.
2. Enciende **💫 Girar en la vitrina de Accesorios**.
3. En **💫 Vitrina · foto SIN FONDO** sube el PNG del accesorio solo, de frente, con el fondo quitado en Canva.
4. **Publicar**.
- Salen solo los que marques, en el orden de tu lista (máximo 12). Si no marcas ninguno, la vitrina no aparece.
- Sin PNG, la página intenta recortar sola tu foto 1 (fondo claro y liso). Si no puede, ese accesorio no sale.
- Los agotados no salen en la vitrina.
- Los **colores** del producto salen como puntitos en la ficha grande (Negro, Blanco, Azul marino, Café, Dorado, Plateado…).

---

## Consejos para las fotos
- Sácalas **verticales (4:5)**, con buena luz y fondo limpio.
- **El panel las optimiza solo:** al elegir una foto aparece "Optimizando fotos…" un segundo, y la foto se achica a un tamaño ideal para la web sin que se note la diferencia (una de 2 MB queda en unos 250 KB). Los PNG de Canva pasan a JPG; los PNG con fondo transparente siguen siendo PNG.
- El panel también le pone un **nombre único** a cada foto, así las `1.jpg`, `2.jpg` de Canva no se pisan entre prendas.

## Lo que ve el cliente
- **Pedido por WhatsApp:** cada prenda llega con su link 📸; al tocarlo se ve la foto de la prenda.
- **Links para Instagram:** en la ficha de cada prenda está **"Copiar link de este producto"**; ese link muestra la foto, el nombre y el precio al compartirlo.

## Si algo falla
- **"No se pudo cargar el catálogo"**: probablemente algo quedó mal escrito. Abre el último producto editado en el panel, revisa y vuelve a publicar.
- **No puedo entrar al panel**: entra desde el navegador normal del celular (Safari o Chrome), con tu sesión de GitHub abierta. Si sigue fallando, mándame una captura.
- Cualquier cosa, mándame una captura y lo vemos 🐺
