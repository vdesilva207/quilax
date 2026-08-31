# Quilax website

## Qué hay en esta carpeta

| Archivo | Para qué |
|---------|----------|
| **`index.html`** | Lo que se publica ahora: pantalla “Coming soon” con gradiente |
| **`preview.html`** | Landing completa (diseño guardado para cuando lancéis) |
| **`css/coming-soon.css`** | Estilos de la página Coming soon |
| **`css/styles.css`** | Estilos de la landing completa |
| **`js/`** | i18n + botón App Store (solo usa `preview.html`) |
| **`assets/`** | Logo, favicon, icono |

### Activar la landing completa más adelante

1. Haz backup de `index.html` (opcional).
2. Copia `preview.html` sobre `index.html`, **o** renombra `preview.html` → `index.html`.
3. Vuelve a desplegar en Netlify.

---

## Publicar en Netlify + appquilax.com

### 1. Subir la web

1. Entra en [https://app.netlify.com](https://app.netlify.com) (cuenta gratis).
2. En el panel principal, arrastra la carpeta **`quilax-website`** entera a la zona **“Deploy manually”** (o “Add new site” → “Deploy manually”).
3. Espera unos segundos. Netlify te dará una URL tipo `https://nombre-random.netlify.app`.
4. Ábrela y comprueba que ves el gradiente y **“Coming soon”**.

### 2. Conectar el dominio appquilax.com

1. En Netlify: tu sitio → **Domain settings** → **Add a domain** → escribe `appquilax.com`.
2. Netlify te mostrará qué registros DNS crear.
3. Ve al panel donde compraste el dominio (GoDaddy, Cloudflare, Namecheap, etc.).
4. En **DNS**, añade lo que Netlify indique. Lo habitual:
   - **A** para `@` (raíz) → IP que te dé Netlify (ej. `75.2.60.5`), **o**
   - **CNAME** para `@` o `www` → `tu-sitio.netlify.app`
5. **No borres** los registros **MX** si usáis email en `quilax@appquilax.com`.
6. Espera entre 5 minutos y unas horas. Netlify activará **HTTPS** solo.

### 3. Actualizar después de cambios

- **Arrastrar de nuevo** la carpeta `quilax-website` en Netlify (sobrescribe el deploy), **o**
- Conectar el repo de GitHub a Netlify para que cada push despliegue solo.

### 4. Cuando publiquéis la app (App Store)

En `preview.html` / `js/main.js` y el `<meta apple-itunes-app>` del HTML completo:

- Poned la URL real de App Store en `appStoreUrl`.
- Descomentad `apple-app-id=...` en el HTML.
- Cambiad `index.html` por la versión completa y redeploy.
