# KeFounder!

**Encontrá a las personas con las que vas a construir.** Plataforma de matching entre founders, talento y proyectos: descubrí, conectá, hacé match y conversá.

## Empezar: frontend y backend juntos, sin XAMPP (recomendado)

**Requisito:** Node.js **22.13 o superior**, con npm. Comprobalo con `node --version` y `npm --version`. La base usa `node:sqlite`, incluido en esa versión de Node: **no hay que instalar MySQL, MariaDB, PHP ni importar un `.sql`**. Git solo hace falta para clonar el repositorio.

En PowerShell, Terminal o una consola abierta en la carpeta del proyecto:

```powershell
git clone https://github.com/BrunoRM04/kefounder.git
cd kefounder
npm ci
npm run build
npm start
```

Abrí **http://localhost:3000**. El comando `npm run build` crea `dist/` (frontend compilado); `npm start` ejecuta `server/index.js` (API Node/Express) y también sirve ese frontend. En el primer arranque crea `data/kefounder.db`, prepara el esquema e incorpora las cuentas de ejemplo automáticamente. Mantené abierta la consola: al cerrarla, se detiene el backend. Para detenerlo manualmente, presioná `Ctrl+C`.

Si descargaste un ZIP de GitHub, descomprimilo, abrí una terminal **dentro de la carpeta que contiene `package.json`** y ejecutá solo `npm ci`, `npm run build` y `npm start`. No hace falta clonar ni descargar un ZIP adicional para el backend: **front y back están en este mismo repositorio**.

| Qué se ejecuta | Archivos principales | Dirección |
|---|---|---|
| Frontend React/Vite compilado | `src/`, `public/`, `index.html` → `dist/` | `http://localhost:3000/` (lo sirve Node) |
| Backend Node/Express | `server/` y `shared/` | `http://localhost:3000/api/…` |
| Base SQLite y archivos subidos | `data/` (se crea localmente) | No se sirve como carpeta pública |

### Desarrollo con cambios en vivo

Ejecutá `npm ci` la primera vez y luego:

```powershell
npm run dev
```

Abrí **http://localhost:5173**. Ese comando inicia la API en el puerto **3000** y Vite en **5173**. Vite redirige `/api` y `/uploads` al backend; para esta modalidad se entra por 5173. Los cambios en `src/` aparecen sin recompilar. Para detener ambos procesos, `Ctrl+C`. Si preferís dos terminales, usá `npm run dev:api` en una y `npm run dev:web` en la otra.

En Windows también está `iniciar-kefounder.cmd`: instala dependencias si falta `node_modules`, compila si falta `dist/index.html` y ejecuta el modo de un solo puerto. `detener-kefounder.cmd` termina los procesos que escuchen en **3000** y **5173**; usalo solo si esos puertos están dedicados a KeFounder!.

### Usar XAMPP: qué copiar y dónde

Esta opción sirve **solo el frontend compilado con Apache**. El backend **sigue ejecutándose con Node.js**: copiar `server/` a `htdocs` no lo convierte en una aplicación PHP. XAMPP MySQL y PHP no se usan. Esta receta usa un puerto exclusivo, **8080**, para que las rutas absolutas del frontend (`/api`, `/uploads`, `/assets`, `/ingresar`, etc.) funcionen desde la raíz.

1. Instalá Node.js 22.13+ y XAMPP con Apache. Cloná o descargá **todo** este repositorio fuera de `htdocs` (por ejemplo, `C:\proyectos\kefounder`). En su raíz ejecutá `npm ci` y `npm run build`.
2. Copiá **el contenido de `dist/`**, no la carpeta `dist` en sí, a `C:\xampp\htdocs\kefounder\`. Ahí debe quedar `C:\xampp\htdocs\kefounder\index.html` junto a `assets/`, `brand/`, iconos y manifest. En PowerShell, desde la raíz del repositorio:

   ```powershell
   New-Item -ItemType Directory -Force C:\xampp\htdocs\kefounder | Out-Null
   Copy-Item .\dist\* C:\xampp\htdocs\kefounder\ -Recurse -Force
   Copy-Item .\deploy\xampp\kefounder-vhost.conf C:\xampp\apache\conf\extra\kefounder-vhost.conf -Force
   ```

3. Editá `C:\xampp\apache\conf\httpd.conf`: agregá `Listen 8080` en una línea nueva (dejá `Listen 80` si usás otros sitios), quitá el `#` de `#LoadModule proxy_http_module modules/mod_proxy_http.so` y agregá `Include conf/extra/kefounder-vhost.conf` al final. En una instalación habitual de XAMPP ya están activos `mod_proxy`, `mod_rewrite` y `mod_dir`; si tu Apache dice que falta alguno, habilitá su `LoadModule`. El archivo copiado configura el sitio en `C:\xampp\htdocs\kefounder`, la navegación de React y el proxy de `/api/` y `/uploads/` hacia Node. Si instalaste XAMPP en otra ruta, cambiá **las dos rutas `C:/xampp/htdocs/kefounder`** dentro de ese archivo.
4. Comprobá la configuración antes de iniciar Apache:

   ```powershell
   & 'C:\xampp\apache\bin\httpd.exe' -t
   ```

   Debe responder `Syntax OK`. Iniciá o reiniciá **Apache** desde el panel de XAMPP. Si el puerto 8080 está ocupado, elegí otro puerto libre y actualizá tanto `Listen` como `<VirtualHost *:8080>`.
5. En **otra consola**, desde la raíz del repositorio (la carpeta que contiene `server/` y `package.json`), iniciá el backend:

   ```powershell
   npm start
   ```

6. Abrí **http://localhost:8080/**, no `http://localhost/kefounder/`. Probá **http://localhost:8080/api/config**: debe devolver JSON. Si responde HTML, el proxy no está activo; revisá `mod_proxy_http`, `Include` y reiniciá Apache. Si da error 503, verificá que `npm start` siga corriendo en el puerto 3000.

En esta configuración, **Apache lee solo `dist/`**; `server/`, `shared/`, `package.json`, `node_modules/` y `data/` permanecen en la carpeta original del repositorio. Después de cambiar el frontend, repetí `npm run build` y la copia de `dist/`. Después de cambiar el backend, reiniciá `npm start`. No copies `data/` ni bases `.db` a `htdocs`.

### Acceso desde un celular en la misma red

El servidor Node escucha por defecto en `0.0.0.0`. Su consola muestra la URL de red (por ejemplo, `http://192.168.0.74:3000`). Usá esa dirección desde el celular conectado al mismo Wi-Fi; la IP concreta cambia según la red. Permití Node.js en redes privadas en el firewall de Windows. Si usás XAMPP, también podés abrir `http://IP_DE_TU_PC:8080/` con Apache y el puerto 8080 permitidos en el firewall. En modo desarrollo, Vite escucha en todas las interfaces y podés usar `http://IP_DE_TU_PC:5173/`.

### Errores frecuentes de instalación

| Síntoma | Qué revisar |
|---|---|
| `node:sqlite` no existe | La versión de Node debe ser 22.13 o superior; comprobá `node --version`. |
| En 3000 se ve solo la API o una ruta vacía | Ejecutá `npm run build` y reiniciá `npm start`; debe existir `dist/index.html`. |
| En 5173 aparece «Sin conexión» | Falta la API en 3000; iniciá `npm run dev` o `npm run dev:api`. |
| En XAMPP carga la página pero falla el login | El proxy de `/api/` no llega a Node; probá `/api/config` en 8080 y revisá `mod_proxy_http`. |
| Apache devuelve 404 al recargar `/ingresar` | Revisá `FallbackResource /index.html` del virtual host y entrá por `http://localhost:8080/`. |
| Puerto 3000, 5173 u 8080 ocupado | Detené el proceso que usa ese puerto. Si cambiás el puerto de la API en desarrollo, fijá `API_PORT` al mismo valor para el proxy de Vite; si usás XAMPP, ajustá también el destino del proxy. |

`data/`, `dist/`, `node_modules/` y los archivos `.env` se excluyen de Git. Cada clon crea su propia base local; las cuentas, chats y uploads creados en una PC **no aparecen** en otra. No subas bases reales, documentos de identidad, archivos subidos ni secretos al repositorio público.

## Cuentas de demostración

| Cuenta | Plan | Para probar |
|---|---|---|
| `sol@kefounder.demo` | Free | Founder de ContaAI. Tiene 7 personas interesadas (ocultas por ser Free), matches con conversación y un borrador de proyecto. Muestra los paywalls. |
| `ana@kefounder.demo` | Plus | Diseñadora. Ve interesados y quién la guardó, filtros avanzados, historial y solicitudes enviadas que puede retirar. |
| `martin@kefounder.demo` | Pro | Developer con el proyecto Formo. Estadísticas, compatibilidad avanzada, candidatos y mensajes sin match (5 por mes). |
| `rodrigo@kefounder.demo` | Startup | Founder de Brote. Varias búsquedas activas, equipo completo, panel de candidatos por etapa y mensajes sin match ilimitados. |

Contraseña de todas: **`kefounder1234`**. También podés entrar con un clic desde la landing («Probá la demo con Sol o Martín»).

Para probar el chat en tiempo real entre dos personas: abrí una ventana normal con Sol y una ventana de incógnito con Martín, y escribanse en su conversación.

Los otros 27 perfiles son de demostración (ficticios): **aceptan conexiones, responden mensajes y de vez en cuando muestran interés en las cuentas activas** (máximo 3 por día) para que el producto se sienta vivo. Se apagan con `KEFOUNDER_DEMO_BOTS=0`.

Para volver los datos de demostración al estado inicial: `npm run seed` (con el servidor detenido). Rehace solo la demo: las cuentas reales, las de prueba y las de administración se conservan.

## Revista KeFounder!

Un diario online público en **`/revista`**: se lee sin cuenta. Desde la bienvenida se entra con el botón «Leé la Revista KeFounder!» (debajo de las cuentas demo). Es el único acceso: dentro de la app no aparece.

- **Portada**: nota destacada, «Lo último», frase destacada, entrevistas, un bloque por sección, «Lo más leído» (últimos 30 días). Al final de cada página, a todo el ancho, una invitación a crear una cuenta.
- **Secciones**: Entrevistas, Startups, Founders, Inversión y Ecosistema (`/revista/seccion/:id`), con «Ver más». También hay búsqueda (`/revista/buscar`).
- **Cada nota** (`/revista/:dirección`): sección, título, bajada, firma, fecha, tiempo de lectura, foto de portada, ficha del protagonista, el texto (con preguntas y respuestas, citas, subtítulos, listas e imágenes), temas, enlace al proyecto en KeFounder! si lo tiene, botones para compartir (enlace, WhatsApp, LinkedIn, X) y «Seguí leyendo».
- **Al compartir** en WhatsApp, LinkedIn o X, el enlace muestra el título, el resumen y la foto de la nota (el servidor los agrega a la página).
- Se cuenta una lectura por persona y nota cada 6 horas; las visitas de administración no cuentan.

Las notas se escriben desde el panel, en **Contenido → Revista**:

- Lista con estado (publicada, programada o borrador), lecturas totales y de 7 días, filtros por sección y origen, y búsqueda.
- **Editor de pantalla completa**: título, bajada y texto con barra de formato (subtítulo, pregunta, respuesta, cita, lista, negrita, enlace, imagen, separador), vista previa igual a la revista y guía de formato. Al costado: sección, formato (entrevista, perfil, noticia o análisis), firma, dirección, foto de portada (subida o de Unsplash) con crédito, protagonista (foto, nombre, cargo y empresa), proyecto de KeFounder! vinculado, temas, gráfico de lecturas y seguimiento (tareas, notas internas e historial).
- **Publicar ahora o programar** para una fecha: la nota sale sola ese día. También se puede despublicar, poner en la portada o eliminar (con motivo). Mientras es borrador, «Vista previa» la muestra con el diseño real, solo para administración.
- El texto nunca admite HTML: el formato se convierte en elementos seguros (sin scripts ni enlaces `javascript:`), y solo se aceptan imágenes subidas por administración o de Unsplash.

En modo demo la revista arranca con **10 notas de ejemplo** sobre los founders y proyectos ficticios de la demo (marcadas «Ejemplo» en el panel y con una aclaración al pie). Se quitan todas juntas con «Quitar notas de ejemplo» y no vuelven a aparecer; `npm run seed` las rehace junto con la demo sin tocar las notas propias.

## Panel de administración

Se entra por `/ingresar` con una cuenta de administración y se va directo a **`/admin`**. Esa cuenta usa solo el panel: no tiene perfil público, no aparece en Descubrir y no puede recibir conexiones.

| Sección | Para qué |
|---|---|
| **Resumen** | Cuentas, activas en 7 días, matches, ingreso mensual (MRR) y perfil completo; tendencia de 30 días; pendientes (reportes, identidades, tareas); activación; cuentas por plan; últimos registros. |
| **Métricas** | Registros, activos, conexiones, matches, mensajes, proyectos y ventas por día (7, 30 o 90 días) con la variación contra el período anterior; embudo de activación; distribución por rol, objetivo, país, etapa e industria; proyectos con más interés. |
| **Ingresos** | MRR, ARR, suscripciones pagas, ticket promedio, altas y bajas del mes, ingreso por plan, ventas por día y todos los movimientos (filtrables y exportables). |
| **Usuarios** | Lista con búsqueda, filtros y orden; ficha con actividad, proyectos, suscripciones, reportes, identidad y seguimiento. Acciones: plan de cortesía, suspender/reactivar, verificar email, cerrar sesiones, cambiar segmento y eliminar (escribiendo el email para confirmar). |
| **Proyectos** | Lista y ficha con rendimiento; ocultar o volver a mostrar con motivo (el founder recibe el aviso). |
| **Moderación** | Cola de reportes por orden de llegada, con los últimos mensajes cuando se reporta una conversación, y verificación de identidad con la foto del documento (aprobar o rechazar con motivo). |
| **Seguimiento** | Tareas con vencimiento y prioridad, vinculadas a cuentas, proyectos, reportes o notas de la revista, y notas internas en cada ficha. |
| **Revista** | Notas, entrevistas y noticias públicas: borradores, publicación programada, portada, lecturas y vista previa (ver «Revista KeFounder!» arriba). |
| **Auditoría** | Registro de cada acción hecha desde el panel (quién, cuándo, sobre qué y el motivo). No se edita ni se borra. |
| **Sistema** | Tamaño y filas de la base, versión del esquema, sesiones, archivos, copia de seguridad con un clic, chequeo de integridad y mantenimiento. |

Cómo se mantiene el orden a medida que crece:

- **Filtros en la dirección**: cada lista guarda búsqueda, filtros, orden y página en la URL; se pueden guardar o compartir y el botón Atrás los respeta.
- **Todo en el servidor**: paginación (25/50/100), orden y búsqueda con índices; los tableros tienen una caché de 30 segundos que se vacía con cada acción del panel.
- **Segmentos**: `real`, `demo`, `bot`, `test` y `staff`. Las métricas cuentan solo cuentas reales, salvo que elijas «Incluir demo».
- **Migraciones versionadas** (`schema_migrations` en `server/db.js`): cada cambio de estructura es una migración nueva que corre una sola vez.
- **Exportar CSV** listo para Excel en español (separador `;`), con las celdas protegidas contra fórmulas.
- **Motivo obligatorio** en suspensiones, cambios de plan, rechazos, proyectos ocultos, reportes resueltos y eliminaciones.

Las cuentas de administración se gestionan desde la consola. La contraseña se escribe sin que se vea en pantalla (o llega por `KEFOUNDER_ADMIN_PASSWORD`) y nunca se guarda en archivos: en la base queda solo su hash.

```bash
npm run admin -- crear --email vos@kefounder.com --nombre "Tu nombre"
npm run admin -- contrasena --email vos@kefounder.com   # la cambia y cierra las sesiones abiertas
npm run admin -- listar
npm run admin -- quitar --email vos@kefounder.com
```

La contraseña de administración necesita al menos 10 caracteres, con letras y números. Las sesiones de administración duran 7 días (las de usuarios, 30).

## Qué incluye

- **Registro, login y onboarding** en 5 pasos (objetivo, rol, disponibilidad, tipo de propuesta, perfil rápido con foto).
- **Descubrir** personas y proyectos: swipe (izquierda pasar, derecha conectar, arriba guardar), botones, atajos de teclado en desktop (← ↑ → y Backspace para volver), filtros básicos y avanzados, orden, deshacer.
- **Compatibilidad** calculada en el servidor (objetivos, roles complementarios, perfiles que busca tu proyecto, disponibilidad, compensación, industria, ubicación) con las razones visibles en cada tarjeta.
- **Match**: conectar envía interés; si es mutuo, es match y se habilita el chat. Quienes ya te eligieron aparecen primero en Descubrir.
- **Chat en tiempo real** (Server-Sent Events): escribiendo…, leído, archivos e imágenes, enlaces, enviar proyecto, proponer reunión con horarios, rompehielos, archivar, reportar, bloquear.
- **Guardados**, **historial de vistos** (Plus), **interesados** y **quién te guardó** (Plus).
- **Mis proyectos**: asistente de 8 pasos, edición completa (portada, logo, historia, perfiles buscados con equity, stack, equipo, tracción), publicar/pausar/duplicar/eliminar, **estadísticas** (Pro) y **panel de candidatos** por etapa (Startup).
- **Perfil** con indicador de completitud y señales de confianza; **notificaciones** en vivo; **planes** Free/Plus/Pro/Startup con precios mensuales y anuales; **configuración** (notificaciones, privacidad, bloqueados, contraseña, eliminar cuenta).
- Página pública para compartir proyectos (`/p/:id`) sin necesidad de cuenta.
- **Revista** pública (`/revista`) con entrevistas, startups, founders, inversión y ecosistema.
- Diseño mobile-first tipo app: barra inferior en mobile, barra lateral en desktop, se instala en la pantalla de inicio (manifest + íconos). En PC (≥1100 px) cada sección pasa a pantalla completa en columnas, con poco scroll (`src/styles/desktop.css`).

### Qué está simulado

- **Pagos**: el checkout es de demostración y no cobra. Para producción, reemplazar `POST /api/billing/checkout` (en `server/routes/billing.js`) por una sesión de Stripe o Mercado Pago y activar el plan desde el webhook de pago confirmado.
- **Emails**: no se envían correos. El código de verificación aparece en pantalla en modo demo y se registra en la consola fuera de ese modo; la recuperación de contraseña por email necesita un proveedor.
- **Verificación de identidad**: la foto del documento queda «En revisión» hasta que administración la aprueba o la rechaza desde Moderación → Identidad.

## Marca

El **isotipo** es una K cuyo tronco es un signo de exclamación: el **!** de «¡Qué founder!». El punto terracota es el momento del match, donde dos personas se encuentran para construir. El **logotipo** es «KeFounder!» en Manrope ExtraBold convertida a trazos, con el mismo «!» de punto terracota.

Los archivos están en `public/brand/` (también se sirven en `/brand/…`):

| Archivo | Uso |
|---|---|
| `kefounder-isotipo.svg` · `kefounder-isotipo-1024.png` | Ícono principal (fondo petróleo) |
| `kefounder-isotipo-claro.svg` | Ícono sobre fondo claro |
| `kefounder-isotipo-solo.svg` · `-solo-crema.svg` | Isotipo sin fondo (petróleo / crema) |
| `kefounder-logotipo.svg` · `-tinta.svg` · `-crema.svg` | Logotipo en petróleo, tinta o crema |
| `kefounder-horizontal.svg` · `-horizontal-crema.svg` · `kefounder-vertical.svg` | Isotipo + logotipo |
| `kefounder-marca.png` | Hoja de marca con usos, tamaños y colores |

En la app, la marca sale de `src/components/Brand.jsx` (`Isotipo`, `IsotipoTile`, `Logotipo`), que dibuja la misma geometría en SVG (`brand-geometry.js`): las letras toman `currentColor` y el punto siempre es terracota (`--warm`).

Colores: petróleo `#345F63`, terracota `#C47F6A`, crema `#F1EDE4`, tinta `#252A2A`.

## Pruebas

```bash
npm test           # 80 pruebas: API (reglas de negocio, planes, permisos, tiempo real, uploads, marca), panel de administración y revista
npm run build && npm run test:e2e   # recorrido completo en Chrome (app, panel y revista) con un servidor y base temporales
node tests/shots.mjs --out capturas --routes /,/matches --sizes small,mobile,hd,win,fhd --metrics 1   # capturas, desbordes y scroll/ancho usado por pantalla
```

## Estructura

```
shared/catalog.js      opciones, planes, límites y textos de paywall (compartido front/back)
shared/revista.js      secciones de la revista y el formato seguro de las notas (compartido front/back)
server/                Express 5 + SQLite (node:sqlite)
  routes/              auth, perfil, descubrir, personas, proyectos, interesados, matches, notificaciones, planes, uploads, revista
  admin/               panel: métricas, cuentas, contenido y moderación, revista, seguimiento, sistema
  revista.js           revista: notas publicadas, lecturas por día, datos para compartir y notas de ejemplo
  admin-cli.js         consola de cuentas de administración (npm run admin)
  db.js                esquema y migraciones versionadas
  services.js          conexiones, matches, mensajes y notificaciones
  compat.js            motor de compatibilidad
  bots.js              actividad de los perfiles de demostración
  seed.js              datos de demostración
src/                   React 18 + Vite
  screens/             una pantalla por archivo
  admin/               panel de administración (paquete aparte: solo lo descarga la cuenta admin)
  revista/             revista pública (paquete aparte)
  components/          UI base, shell, tarjetas, gráficos, hojas
  lib/                 API, router, sesión + tiempo real, formato
tests/                 API (node:test), e2e (Playwright) y capturas
data/                  base de datos y archivos subidos (se crea sola)
```

## Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `HOST` | `0.0.0.0` | Interfaz de red |
| `KEFOUNDER_DATA_DIR` | `./data` | Carpeta de la base y los uploads |
| `KEFOUNDER_DEMO` | `1` | `0` oculta los accesos a cuentas demo |
| `KEFOUNDER_DEMO_BOTS` | `1` | `0` apaga las respuestas automáticas de los perfiles demo |
| `KEFOUNDER_TRUST_PROXY` | `loopback` | Detrás de un proxy (Nginx, Cloudflare…): cuál es, para leer la IP real de quien visita (`1`, una IP o `loopback`) |
| `KEFOUNDER_ADMIN_PASSWORD` | — | Solo para `npm run admin`, si no querés escribir la contraseña en la consola |

Las variables `FOUND_*` de antes del cambio de nombre siguen funcionando. Al primer arranque, una base vieja `data/found.db` se migra sola a `data/kefounder.db` (la original queda como `data/found-legacy.db`) y las cuentas demo pasan a `@kefounder.demo`.

Para publicarlo con usuarios reales: `KEFOUNDER_DEMO=0`, `KEFOUNDER_DEMO_BOTS=0`, una base limpia (borrar `data/` sin volver a sembrar o quitar los perfiles demo), HTTPS delante (la cookie de sesión se marca `Secure` automáticamente detrás de un proxy HTTPS) y un proveedor de pagos real.
