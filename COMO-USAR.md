# Catálogo Lobo de Lujo · Guía

- **Parte A:** configurar todo (una sola vez, unos 20 minutos, mejor desde el computador)
- **Parte B:** usar el panel día a día (desde el celular)

---

# PARTE A · Configuración (una sola vez)

## Paso 1 · Crear tu cuenta de GitHub
1. Entra a **github.com** → **Sign up**.
2. Usa tu correo, crea una contraseña y elige un **nombre de usuario** (ej: `lobodelujo`). **Anótalo.**
3. Confirma el correo que te llega.

## Paso 2 · Crear el repositorio (donde vive tu web)
1. Arriba a la derecha toca **+** → **New repository**.
2. **Repository name:** `lobodelujo`
3. Déjalo en **Public** (o Private, funcionan los dos).
4. Marca **Add a README file** → **Create repository**.

## Paso 3 · Ajustar una línea antes de subir
Abre el archivo `admin/config.yml` con el Bloc de notas y cambia:
```
repo: lobodelujo/lobodelujo
```
por tu usuario real. ✅ Ya está listo en tu ZIP, no tienes que tocar nada.
*(O dime tu usuario y lo dejo listo yo.)*

## Paso 4 · Subir los archivos
1. En tu repositorio toca **Add file** → **Upload files**.
2. Abre la carpeta `catalogo` en tu computador, **selecciona todo lo que hay dentro** (Ctrl + A) y arrástralo a la página.
   ⚠️ Arrastra el **contenido** de la carpeta, no la carpeta `catalogo` entera.
3. Abajo toca **Commit changes**.
4. Revisa que en GitHub se vean `index.html`, `admin`, `datos`, `img`, etc.

## Paso 5 · Publicar en Netlify
1. Entra a **netlify.com** → **Sign up** → **Continue with GitHub**.
2. **Add new project** → **Import an existing project** → **GitHub** → autoriza → elige `lobodelujo`.
3. No cambies nada → **Deploy**.
4. Cuando termine, ve a **Project configuration** → **Change project name** y pon `lobodelujo` (o el que esté libre).
   Tu web queda en: **https://lobodelujo.netlify.app** ✅

## Paso 6 · Conectar el inicio de sesión del panel
**6a · En GitHub**
1. Foto de perfil → **Settings** → abajo a la izquierda **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Llena:
   - **Application name:** `Panel Lobo de Lujo`
   - **Homepage URL:** `https://lobodelujo.netlify.app` (tu dirección del paso 5)
   - **Authorization callback URL:** `https://api.netlify.com/auth/done`
3. **Register application**.
4. Copia el **Client ID**. Luego toca **Generate a new client secret** y copia el **secret**.
   ⚠️ Esos dos códigos se pegan **solo en Netlify**. No los compartas con nadie, tampoco conmigo.

**6b · En Netlify**
1. En tu proyecto: **Project configuration** → **Access & security** → **OAuth**.
2. **Install a provider** → **GitHub** → pega el **Client ID** y el **Secret** → **Install**.

## Paso 7 · ¡Probar!
Entra desde el celular a **https://lobodelujo.netlify.app/admin** → **Iniciar sesión con GitHub** → listo 🐺

💡 **Tip:** en el celular, abre `/admin` y usa "Agregar a pantalla de inicio" para tener el panel como una app.

---

# PARTE B · Uso diario desde el celular

Entra a **tuweb.netlify.app/admin** → **Catálogo**.

## ➕ Agregar un producto
1. Toca **🛍️ Productos**.
2. Toca **Agregar producto** (aparece arriba de la lista).
3. Completa:
   - **Nombre**
   - **Categoría** (menú)
   - **Precio**: sin puntos ni $, ej: `15990`
   - **Precio anterior**: solo si está en oferta
   - **Etiqueta**: Nuevo, Oferta o Últimas unidades (opcional)
   - **¿Hay stock?**: encendido
   - **Descripción**
   - **Tallas**: toca y elige varias
   - **Colores**: separados por coma, ej. `Negro, Blanco`
   - **Fotos**: toca **Agregar foto** → **Elegir una imagen** → **Subir** → elige de la galería. Repite por cada foto (4 o más). La primera es la portada.
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

## ⚙️ Cambiar WhatsApp, frase o categorías
**⚙️ Datos de la tienda** → cambia → **Publicar**.
- Para agregar el **segundo WhatsApp**: en "Números de WhatsApp" toca **Agregar número**.

## 🎬 Cambiar el video de portada
Es lo primero que se ve al entrar, a pantalla completa. **⚙️ Datos de la tienda** → **🎬 Video de portada**:
- **Video computador**: MP4 horizontal (1920 × 1080), de 10 a 20 segundos, **máximo 10 MB**.
- **Video celular**: MP4 vertical (1080 × 1920). Si lo dejas vacío, el celular usa el horizontal recortado al centro.
- **Imagen mientras carga**: una captura del video (opcional, hace que se vea algo al instante).
- El video parte **sin sonido** (los celulares no dejan que suene solo). El cliente puede activarlo con el botón 🔈 de la esquina.
- ⚠️ Los videos del iPhone (.MOV) no se ven en todos los celulares: pásalo por **CapCut** → Exportar en **1080p** y queda en MP4.
- Para quitar el video: borra el archivo del campo → **Publicar**.

## 📸 Fotos grandes de cada categoría
Al bajar, cada categoría aparece con **1 foto grande + 2 productos chicos** (como McQueen).
- **⚙️ Datos de la tienda** → **📸 Foto grande de cada categoría** → **Agregar** → elige la categoría y sube la foto (horizontal 1920 × 1080, y si quieres una vertical 1080 × 1350 para celular) → **Publicar**.
- Si una categoría no tiene foto grande, se usa la foto del primer producto.
- Los 2 productos chicos son los primeros de esa categoría según el orden de **🛍️ Productos**. Para cambiar cuáles salen, cambia el orden.
- El orden de las categorías es el de **Orden de las categorías**. Las categorías sin productos no aparecen.
- **Accesorios** es distinta: no lleva foto grande, se muestra como **6 fotos chicas (3 por fila)** con los primeros 6 accesorios.

## 🆕 Recién llegados
Al final de todas las categorías aparece **Recién llegados**: una fila de 3 fotos chicas que se desliza hacia la izquierda para ver más.
- Salen los productos que tienen la etiqueta **Nuevo** (y con stock). Para sacar uno, quítale la etiqueta.
- Si ningún producto tiene la etiqueta Nuevo, salen los últimos que agregaste.

---

## Consejos para las fotos
- Sácalas **verticales**, con buena luz y fondo limpio.
- Puedes subirlas tal cual salen del celular: la web las achica sola para que cargue rápido.
- Nombres simples si puedes (sin espacios ni tildes): `polera-negra-1.jpg`.

## Si algo falla
- **"No se pudo cargar el catálogo"**: probablemente algo quedó mal escrito. Abre el último producto editado en el panel, revisa y vuelve a publicar.
- **No puedo entrar al panel**: revisa el Paso 6 (que la dirección de Netlify sea la correcta en GitHub).
- Cualquier cosa, mándame una captura y lo vemos 🐺
