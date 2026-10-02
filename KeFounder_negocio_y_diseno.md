# KeFounder! — El negocio y su diseño de interfaz

Este documento explica dos cosas:

1. **De qué se trata el negocio:** qué problema resuelve KeFounder!, para quién es, cómo funciona y cómo gana dinero.
2. **Cómo está diseñada la interfaz:** marca, colores, tipografías, medidas, componentes, estructura de pantallas y cómo está construido el frontend.

Sirve para presentar el proyecto y para que cualquier persona que diseñe o programe una pantalla nueva mantenga el mismo estilo. Los valores salen del código actual: los colores y las medidas están en `src/styles/base.css`, y la marca en `src/components/Brand.jsx`.

---

## Parte 1 — El negocio

### 1.1. Qué es

**KeFounder!** es una plataforma de *matching* para construir proyectos. Conecta a founders, talento (developers, diseñadores, marketing, ventas, producto, operaciones, advisors…) y startups que buscan sumar gente.

Toma la simpleza de una app de descubrimiento tipo Tinder y la aplica a una pregunta concreta:

> **¿Con quién puedo construir mi próximo proyecto?**

El nombre se escribe siempre con el signo: **KeFounder!** (se lee como «¡Qué founder!»).

- **No es** una bolsa de trabajo ni una red social profesional como LinkedIn.
- **Es** descubrimiento rápido de personas y proyectos compatibles para construir juntos.

### 1.2. El problema y la solución

| | |
|---|---|
| **Problema** | Encontrar socios y talento para un proyecto nuevo es lento, está disperso y depende demasiado de los contactos personales. |
| **Solución** | Tarjetas claras de personas y proyectos, en lugar de CV o perfiles largos. En segundos se ve quién es cada uno, qué sabe hacer, qué busca, cuánto tiempo puede dedicar, qué compensación espera (equity, pago o ambas) y qué tan compatible es con vos. |

### 1.3. Para quién

| Perfil | Qué busca | Ejemplo |
|---|---|---|
| **Founder** | Personas para construir su idea o startup. | «Busco CTO para mi fintech». |
| **Talento** | Un proyecto donde aportar lo que sabe hacer. | Una diseñadora que quiere sumarse a una startup temprana. |
| **Equipo o startup** | Seguir sumando perfiles a un equipo que ya existe. | CEO y CTO que necesitan alguien de Growth. |
| **Explorar** | Ver qué se está construyendo. | Alguien que todavía no decidió qué hacer. |

### 1.4. Cómo funciona

El recorrido central es:

> **Descubrir → Conectar → Match → Conversar → Construir**

1. **Perfil en cinco pasos:** objetivo, rol, disponibilidad, tipo de propuesta y perfil rápido con foto.
2. **Descubrir:** un mazo de tarjetas de **personas** o de **proyectos**. Con cada tarjeta se puede:
   - **Pasar:** no interesa.
   - **Guardar:** para verla más tarde.
   - **Conectar:** mostrar interés.
3. **Match:** si el interés es mutuo, es match y se abre el chat.
4. **Conversar:** chat en tiempo real, con archivos, enlaces, propuesta de reunión y la opción de compartir un proyecto.
5. **Construir:** los founders publican proyectos con los perfiles que buscan y siguen a sus candidatos por etapas.

La **compatibilidad** se calcula en el servidor. Considera objetivos, roles complementarios, los perfiles que busca cada proyecto, disponibilidad, compensación, industria y ubicación. Cada tarjeta muestra el porcentaje y los motivos.

Además, el producto tiene:

- **Revista KeFounder!** (`/revista`): un diario online público con entrevistas, startups, founders, inversión y ecosistema. Se lee sin cuenta y se entra desde la pantalla de bienvenida.
- **Panel de administración** (`/admin`): métricas, ingresos, usuarios, proyectos, moderación, seguimiento interno, edición de la revista, auditoría y sistema.

### 1.5. Modelo de negocio

El negocio es **freemium con suscripciones**: hay un plan gratuito y tres pagos. No hay publicidad, comisiones, venta de datos ni pagos por contratación.

| | Free | Plus | Pro | Startup |
|---|---:|---:|---:|---:|
| Precio mensual | US$ 0 | US$ 4,99 | US$ 9,99 | US$ 19,99 |
| Precio anual | — | US$ 49 | US$ 99 | US$ 199 |
| Conexiones | 10 por día | Ilimitadas | Ilimitadas | Ilimitadas |
| Guardados | 10 | Ilimitados | Ilimitados | Ilimitados |
| Ver quién está interesado y quién te guardó | No | Sí | Sí | Sí |
| Filtros avanzados e historial | No | Sí | Sí | Sí |
| Estadísticas y compatibilidad avanzada | No | No | Sí | Sí |
| Visibilidad prioritaria | No | No | Sí | Sí |
| Mensajes sin match | No | No | 5 por mes | Ilimitados |
| Proyectos activos | 1 | 1 | 3 | 5 |
| Panel de candidatos y perfil de equipo | No | No | No | Sí |

Cada plan apunta a un tipo de uso distinto:

- **Free:** para descubrir la plataforma.
- **Plus:** para conectar sin límites.
- **Pro:** para buscar activamente.
- **Startup:** para armar un equipo.

El aviso de mejorar el plan (*paywall*) aparece solo cuando hay intención: al llegar a un límite o al tocar una función paga.

**Estado actual:** el cobro es de demostración y no cobra de verdad. Para producción se conecta Stripe o Mercado Pago. Los correos tampoco se envían todavía: en modo demo, el código de verificación se muestra en pantalla.

### 1.6. Posicionamiento

> **Encontrá a las personas con las que vas a construir.**

El deslizar tarjetas es solo la mecánica. El valor real es el sistema de compatibilidad entre personas, skills, proyectos, disponibilidad, etapa, compensación y objetivos.

A futuro, la plataforma puede convertirse en la herramienta con la que se arma un equipo completo. El camino va de encontrar un cofundador a sumar developer, diseño y growth, y a seguir administrando las búsquedas desde KeFounder!.

---

## Parte 2 — El diseño de interfaz

### 2.1. Principios

- **Minimalista y directo:** cada pantalla responde una sola pregunta («¿Me interesa esta persona?», «¿Quiero sumarme a esto?»), sin tableros cargados de información.
- **Serio pero amigable:** colores sobrios y cálidos, bordes redondeados, textos cortos en español rioplatense («vos»).
- **Pensado primero para el celular:** se siente como una app, con barra inferior, hojas que suben desde abajo, gestos y botones grandes.
- **En PC, como un programa de pantalla completa:** desde 1100 px cada sección usa todo el ancho, en columnas y con muy poco scroll.
- **Un solo acento fuerte:** el verde petróleo concentra la acción y el terracota se reserva para detalles. No hay varios colores saturados compitiendo.

### 2.2. Marca

| Elemento | Descripción |
|---|---|
| **Isotipo** | Una **K** cuyo tronco es un signo de exclamación. El **punto terracota** representa el momento del match. Se lee bien desde 16 px (favicon) hasta el ícono de la app. |
| **Logotipo** | «KeFounder!» en **Manrope ExtraBold** convertida a trazos, con un «!» propio cuyo punto también es terracota. |
| **Colores de uso** | Petróleo sobre fondos claros, crema sobre petróleo. El punto es siempre terracota. |
| **Dónde aparece** | Isotipo en crema en la barra lateral de PC; logotipo en la barra superior, la bienvenida, el ingreso, el registro y la página pública de proyectos; isotipo en un cuadro petróleo en la pantalla de carga, el favicon y los íconos de instalación. |
| **Archivos** | `public/brand/`: hoja de marca `kefounder-marca.png` e íconos. Además, isotipo y logotipo por separado en 8 variantes de color (color, negativo, negativo blanco, tinta y monocromos petróleo, negro, blanco y crema), en PNG sin fondo de varios tamaños y en SVG: `public/brand/isotipo/` y `public/brand/logotipo/`, con la hoja `kefounder-variantes.png`. |
| **En el código** | `src/components/Brand.jsx` (`Isotipo`, `IsotipoTile`, `Logotipo`). Las letras toman el color del texto (`currentColor`) y el punto usa `--warm`. |

### 2.3. Colores

La paleta combina **verde petróleo, salvia azulada, terracota y crema**, con texto casi negro. Todo está en variables CSS en `src/styles/base.css`. Ningún componente debería usar un color suelto que no esté en esta tabla.

#### Colores principales

| Color | HEX | Variable | Para qué se usa |
|---|---|---|---|
| Verde petróleo | `#345F63` | `--accent` | Color de marca y de acción: botón principal, botón Conectar, barra lateral de PC, enlaces, gráficos y la marca. |
| Salvia azulada | `#78999A` | `--accent-muted` | Íconos auxiliares, indicador «en línea», detalles decorativos. |
| Terracota | `#C47F6A` | `--warm` | Punto del «!», contadores de notificaciones, botón Pasar, subrayado de la sección activa y detalles cálidos. |
| Crema | `#F1EDE4` | `--bg` · `--on-primary` | Fondo general de toda la app y texto claro sobre petróleo. |
| Tinta | `#252A2A` | `--ink` | Texto principal y títulos. |

#### Tonos de apoyo

| HEX | Variable | Uso |
|---|---|---|
| `#294D51` | `--accent-strong` | Petróleo oscuro para hover y presionado. |
| `#FBF8F2` | `--surface` | Tarjetas, formularios, hojas y paneles. |
| `#F5F1E9` | `--surface-2` | Superficies secundarias (cabeceras de tabla, cajas internas). |
| `#E9E9DF` | `--soft` | Fondos suaves y controles agrupados (selectores de pestañas). |
| `#E3EAE4` | `--accent-soft` | Fondo suave de marca: mensajes propios del chat, elementos activos. |
| `#D4E0DA` | `--accent-soft-2` | Selección de texto y fondos de avatares o proyectos sin foto. |
| `#B7CAC6` | `--accent-line` | Bordes de la familia petróleo y barras de scroll. |
| `#CFD8D2` | `--line` | Bordes y separadores generales. |
| `#DFE3DA` | `--line-soft` | Separadores de menor énfasis. |
| `#425859` | `--ink-2` | Texto secundario con matiz petróleo. |
| `#5D6F70` | `--muted` | Descripciones, ayudas y fechas. |
| `#C9D8D6` | `--on-primary-muted` | Texto claro secundario sobre petróleo. |
| `#F0E1D8` | `--warm-soft` | Fondo de avisos y alertas. |
| `#E2C4B7` | `--warm-line` | Bordes de la familia terracota. |
| `#935A48` | `--danger` · `--gold` | Texto cálido oscuro para alertas, acciones sensibles y estados «programado» o «pendiente». |

**Versiones transparentes:** se usan para barras con desenfoque, oscurecer el fondo detrás de una hoja y sombras. Por ejemplo, `#F1EDE4EE` (barra superior), `#252A2A66` (fondo detrás de un modal) y `#345F632E` (sombra de marca). Son los mismos colores con transparencia, no una familia nueva.

**Acentos de avatares y portadas sin foto:** `#D4E0DA`, `#E8D5CC`, `#C9D8D6`, `#F0E1D8`, `#E3EAE4` y `#DFE3DA`, definidos en `shared/theme.js`. Sobre ellos se muestran las iniciales o el «!».

**Etiquetas de plan:**

| Plan | Fondo | Texto |
|---|---|---|
| Free | gris suave `--soft` | `--muted` |
| Plus | `--accent-soft` | petróleo |
| Pro | tinta `--ink` | crema |
| Startup | petróleo oscuro `--accent-strong` | crema |

**Reglas de uso:**

- **El petróleo es la acción.** Si algo es la acción principal de la pantalla, va en petróleo. Hay una sola acción principal por vista.
- **El terracota es un detalle, nunca un fondo grande.** Aparece en puntos, contadores, alertas y el botón Pasar.
- **Las fotos conservan sus colores naturales:** la paleta no las tiñe.
- **Hoy hay solo modo claro** (`color-scheme: light`). El color de la barra del navegador es crema (`#F1EDE4`).

#### Contraste comprobado

| Combinación | Contraste |
|---|---:|
| Tinta `#252A2A` sobre crema `#F1EDE4` | 12,45:1 |
| Crema `#F1EDE4` sobre petróleo `#345F63` | 6,07:1 |
| Texto secundario `#5D6F70` sobre crema | 4,52:1 |
| Tinta sobre terracota `#C47F6A` | 4,57:1 |

Los textos chicos usan siempre tonos oscuros. La salvia queda para íconos y detalles, no para texto chico.

### 2.4. Tipografía

| Fuente | Rol | Pesos cargados | Variable |
|---|---|---|---|
| **Manrope** | Títulos, marca, números grandes, nombres en las tarjetas y titulares de la revista. | 500, 600, 700, 800 | `--font-display` |
| **DM Sans** | Texto de lectura, botones, formularios, etiquetas y tablas. | 400, 500, 600, 700 | `--font-body` |

Las dos se cargan desde Google Fonts. Si no cargan, se usan las fuentes del sistema (`system-ui`, `-apple-system`, `Segoe UI`). Todos los `h1` a `h4` usan Manrope automáticamente.

#### Escala de tamaños

| Uso | Tamaño | Peso | Detalle |
|---|---|---|---|
| Titular de la bienvenida | 38 a 96 px (se adapta a la pantalla) | 700 | Espaciado entre letras −0,05 em |
| Titular de una nota de la revista | 30 a 56 px | 800 | −0,04 em, líneas equilibradas |
| Título de página | 32 px (celular) / 38 px (PC) | 700 | −1,2 px / −1,6 px, termina con un punto en salvia |
| Nombre en la tarjeta de Descubrir | 27 px | 700 | Sobre la foto, en crema |
| Número de estadística | 30 px | 700 | Manrope |
| Título de sección o de hoja | 18 a 20 px | 700 | |
| Título de tarjeta | 17 a 19 px | 700 a 800 | Manrope |
| Texto base | 15 px | 400 | Interlineado 1,5 |
| Texto de lectura en la revista | 18 px (17 px en celular) | 400 | Interlineado 1,72 |
| Campos de formulario | 16 px | 400 | Evita que el iPhone haga zoom al tocar el campo |
| Botones | 14 px (13 px en los chicos) | 600 | |
| Texto secundario | 13 px | 400 a 500 | |
| Etiqueta superior (*kicker*) | 11 px | 700 | MAYÚSCULAS, separación 0,12 em, en petróleo |

Variables de tamaño: `--fs-xs` 12 px, `--fs-sm` 13 px, `--fs-md` 15 px, `--fs-lg` 17 px y `--fs-xl` 21 px.

**Detalles tipográficos:**

- Los títulos tienen espaciado negativo entre letras para verse compactos.
- Los números de tablas y estadísticas usan cifras de ancho fijo (`tabular-nums`) para alinearse.
- Los títulos largos se reparten de forma pareja entre líneas (`text-wrap: balance`).

### 2.5. Formas, sombras y espacios

#### Radios de borde

| Variable | Valor | Dónde |
|---|---|---|
| `--r-sm` | 8 px | Elementos chicos. |
| `--r-md` | 12 px | Botones, campos de formulario y botones de ícono. |
| `--r-lg` | 16 px | Tarjetas. |
| `--r-xl` | 22 px | Hojas que suben desde abajo. |
| — | 20 px | Tarjeta del mazo de Descubrir. |
| — | 999 px | Pills, chips, etiquetas de plan, avisos (*toasts*) y avatares. |

#### Sombras (suaves y con matiz de marca)

| Variable | Valor |
|---|---|
| `--shadow-sm` | `0 1px 2px #252A2A0D, 0 1px 3px #252A2A0A` (sutil, para controles) |
| `--shadow` | `0 10px 30px #345F6312` (tarjetas destacadas) |
| `--shadow-lg` | `0 24px 60px #345F6324` (hojas y menús flotantes) |

#### Espacios y medidas

- **Margen lateral de página** (`--gutter`): 16 px en celular, 28 px desde 760 px y 32 px desde 1100 px.
- **Anchos máximos de contenido:** 680 px (formularios), 980 px y 1120 px. En PC de pantalla completa, hasta 1680 px.
- **Barra superior:** 64 px (72 px entre 760 y 1099 px).
- **Barra inferior en celular:** 64 px más el área segura del teléfono.
- **Barra lateral en PC:** 88 px.
- **Zonas táctiles:** mínimo 44 × 44 px (botones de ícono, botón Volver, botones normales).
- **Bordes:** 1 px, en `--line` o `--line-soft`.
- Se respetan las **áreas seguras** del teléfono (muesca y barra de gestos) con `env(safe-area-inset-*)`.

### 2.6. Estructura y navegación

| Tamaño | Navegación |
|---|---|
| **Celular (hasta 759 px)** | Barra superior con el logotipo, notificaciones y perfil. **Barra inferior** con Descubrir, Matches, Guardados, Proyectos y Perfil; la opción activa va en petróleo con una línea arriba. Las opciones y menús se abren como **hojas que suben desde abajo**. |
| **Tablet y PC (desde 760 px)** | **Barra lateral petróleo** de 88 px con el isotipo en crema. Arriba: Descubrir, Matches, Guardados, Mis proyectos y Perfil. Abajo: Plan y Ajustes. La opción activa va en crema con texto petróleo. Los menús son ventanas flotantes. |
| **PC grande (desde 1100 px)** | Cada sección pasa a **pantalla completa en columnas** (`src/styles/desktop.css`). Descubrir ocupa exactamente la altura de la ventana. El chat suma un panel lateral con los datos de la otra persona desde 1400 px. |

#### Cortes de pantalla

| Ancho | Qué cambia |
|---|---|
| 460 px | Ajustes de celulares chicos (botones a todo el ancho). |
| 560 / 600 / 700 px | Grillas de tarjetas de una a dos columnas. |
| **760 px** | **Pasa de celular a escritorio:** barra lateral en lugar de barra inferior. |
| 900 px | Grillas de dos a tres columnas. |
| **1100 px** | **Modo software de pantalla completa.** |
| 1280 / 1400 / 1600 px | Columnas extra (por ejemplo, «A continuación» en Descubrir o el panel del chat). |

### 2.7. Componentes

Los componentes de base están en `src/components/ui.jsx` y sus estilos en `src/styles/components.css`.

| Componente | Cómo se ve |
|---|---|
| **Botón** | Alto de 44 px (36 el chico, 52 el grande), radio 12 px, texto 14 px peso 600. Variantes: **principal** (petróleo, texto crema, sombra de marca), **secundario** (superficie clara con borde), **suave** (fondo `--accent-soft`), **fantasma** (sin fondo), **peligro** (fondo terracota claro, texto `--danger`) y **oscuro** (tinta). Al presionar se achica a 98 %. |
| **Botón de ícono** | 44 × 44 px y radio 12. Puede llevar contador (círculo terracota) o punto de aviso. |
| **Botones redondos de Descubrir** | Círculos de 50 a 58 px. **Volver** y **Guardar** con borde gris. **Pasar** con borde y ícono terracota. **Conectar** relleno en petróleo con ícono crema. Al pasar el mouse suben 2 px. |
| **Chip** | Píldora de 38 px de alto, borde fino; activo con tilde. Se usa para elegir roles, skills y filtros. |
| **Pill / etiqueta** | 26 px de alto, texto 12 px. Tonos: neutro, petróleo suave, sólido, cálido, apagado y sobre foto (vidrio con desenfoque). |
| **Selector de pestañas** (*segmented*) | Cápsula gris suave; la opción activa en crema con sombra mínima (por ejemplo, Personas / Proyectos). |
| **Interruptor** (*toggle*) | 46 × 28 px; encendido en petróleo. |
| **Campos de formulario** | 48 px de alto, radio 12, borde `--line`. Al enfocarse: borde salvia y halo `--accent-soft`. Con error: borde terracota. Etiqueta en 14 px peso 600; ayuda y error en 13 px. Existen versiones para texto, área de texto, selector y etiquetas con sugerencias. |
| **Hoja** (*sheet*) | En celular sube desde abajo con radio 22 px arriba, una manija gris y el fondo oscurecido; en PC queda centrada. Se usa para confirmaciones, filtros, reportes y paywall. |
| **Menú de acciones** | Ventana flotante en PC; hoja desde abajo en celular. |
| **Aviso breve** (*toast*) | Píldora oscura (tinta) con texto crema, abajo al centro; los errores van en un marrón terracota. |
| **Banner de notificación** | Tarjeta flotante arriba, en tiempo real, para mensajes, interesados y matches. |
| **Avatar** | Círculo con foto, o las iniciales sobre un acento de marca. El punto de presencia es salvia si la persona está en línea. |
| **Logo y portada de proyecto** | Cuadro redondeado con el logo, o la inicial sobre el acento. Las portadas sin foto muestran el acento con un «✳». |
| **Tarjeta del mazo** | Radio 20 px. Foto arriba con degradado oscuro, nombre en crema 27 px, etiqueta de tipo y porcentaje de match en una píldora crema. Abajo: rol, qué busca, disponibilidad y compensación. |
| **Burbujas de chat** | Radio 18 px. Mensajes propios en `--accent-soft` con borde petróleo claro; los de la otra persona en superficie clara con borde gris. |
| **Etiqueta de plan** | Píldora de 22 px en MAYÚSCULAS 11 px, con el color de cada plan (ver colores). |
| **Estados vacíos, de error y de carga** | Centrados, con ícono, título de 18 px y texto en `--muted`. La carga usa esqueletos con brillo animado y un spinner. |
| **Gráficos** | Una sola serie en petróleo: columnas por día con la etiqueta del pico, barras horizontales y tarjetas de estadística con variación (▲ petróleo, ▼ terracota). Cada gráfico permite ver los datos en tabla. Están en `src/components/Charts.jsx`. |
| **Celebración de match** | Pantalla completa con los dos avatares, «¡Es un match!» en Manrope 40 px peso 800 y botones para escribir o seguir descubriendo. |

### 2.8. Íconos e imágenes

- **Íconos:** librería **Lucide** (`lucide-react`), de trazo fino (1,8 en la navegación). Se usan de 15 a 22 px y pocos a la vez.
- **Fotos:** las de personas y proyectos son subidas por los usuarios o de Unsplash. Si una foto falta o no carga, se muestra el acento de marca con las iniciales o el «!».
- **Fotos subidas:** se achican en el navegador antes de subirlas, para que carguen rápido en el celular.

### 2.9. Movimiento

| Animación | Detalle |
|---|---|
| Entrada de pantalla | Aparece y sube 8 px en 0,24 s. |
| Hojas | Suben desde abajo en 0,26 s con curva suave. |
| Tarjetas del mazo | Entran, se arrastran con el dedo y salen hacia el costado al pasar o conectar. |
| Bienvenida | Las palabras aparecen con un desenfoque que se aclara, más un anillo y halos de color que giran lento. |
| Estados de carga | Brillo que recorre los esqueletos. |
| Hover | Botones y tarjetas suben 1 o 2 px; las fotos de la revista hacen un zoom leve. |

Si el dispositivo pide menos movimiento (*prefers-reduced-motion*), las animaciones se desactivan.

### 2.10. Accesibilidad

- Al navegar con teclado, el foco se marca con un contorno petróleo de 2 px.
- Etiquetas y roles accesibles en botones de ícono, pestañas, menús, hojas y gráficos.
- Zonas táctiles de al menos 44 px y campos de 16 px.
- Contraste verificado en las combinaciones principales (ver 2.3).
- Los gráficos tienen una versión en tabla. La revista tiene un enlace «Saltar al contenido».

### 2.11. Los dos subsistemas visuales

Comparten los mismos colores y tipografías, pero tienen su propia estructura y un prefijo en sus clases para no mezclarse con la app.

#### Panel de administración — prefijo `adm-` (`src/styles/admin.css`)

- **Barra lateral petróleo** de 244 px con el isotipo, el logotipo y el texto «Administración». Las secciones se agrupan en Panorama, Gestión, Contenido y Control, con contadores terracota de pendientes.
- **Por tamaño de pantalla:**
  - **PC:** se comporta como un software. La barra lateral queda fija y el contenido se desplaza por su cuenta. Las tablas y el editor de notas ocupan la altura de la ventana.
  - **Tablet:** la barra se reduce a íconos (76 px).
  - **Celular:** el menú se despliega desde el costado y cada fila de tabla se convierte en una tarjeta.
- **Piezas propias:**
  - tarjetas de indicadores (KPI);
  - tablas con orden y paginación;
  - filtros guardados en la dirección de la página;
  - estados con color (Activa, Suspendida, En revisión, Publicada, Programada…);
  - hojas de confirmación que piden motivo;
  - línea de tiempo de auditoría.

#### Revista — prefijo `rv-` (`src/styles/revista.css`)

- **Estilo de diario online.** Cabecera con el logotipo, una etiqueta terracota «REVISTA», la fecha y la búsqueda. Debajo, el menú de secciones, con la sección activa subrayada en terracota.
- **Portada:** nota principal grande, columna «Lo último», frase destacada con comillas terracota, bloques por sección y «Lo más leído» con números grandes en terracota.
- **Notas:**
  - titulares en Manrope 800;
  - primera letra capitular en petróleo;
  - preguntas marcadas «P.» en terracota y respuestas «R.»;
  - citas con borde izquierdo terracota;
  - ficha de la persona protagonista;
  - botones para compartir.
- **Al final de cada página:** una invitación a crear cuenta a todo el ancho, en petróleo. Después, un pie oscuro (tinta).

### 2.12. Cómo está hecho el frontend

| Pieza | Detalle |
|---|---|
| **Tecnología** | React 18 con Vite 6. Sin frameworks de CSS: **CSS propio con variables** (*design tokens*). |
| **Paquetes separados** | La app, el panel de administración y la revista se descargan por separado. Quien lee la revista o usa la app nunca descarga el panel. |
| **Navegación** | Router propio (`src/lib/router.jsx`). La sesión y el tiempo real (Server-Sent Events) se manejan en `src/lib/app.jsx`. |
| **Datos compartidos** | `shared/catalog.js` (opciones, planes y límites), `shared/theme.js` (acentos) y `shared/revista.js` (secciones y formato de las notas). Se usan tanto en el navegador como en el servidor. |

#### Archivos de estilos

| Archivo | Contenido |
|---|---|
| `base.css` | Variables de color, tipografía, radios, sombras y medidas; estilos base; marca; animaciones; movimiento reducido. |
| `components.css` | Botones, pills, chips, pestañas, campos, hojas, menús, avisos, avatares, paywall y celebración. |
| `shell.css` | Barra lateral, barra inferior, barra superior, encabezados de página y tarjetas. |
| `discover.css` | Mazo de Descubrir, tarjetas y botones redondos. |
| `detail.css` | Fichas de persona y de proyecto. |
| `inbox.css` | Matches y chat. |
| `screens.css` | Bienvenida, ingreso, registro y pasos del onboarding. |
| `pages.css` | Perfil, proyectos, estadísticas, planes, guardados, notificaciones y configuración. |
| `desktop.css` | Modo de pantalla completa para PC (desde 1100 px). |
| `admin.css` | Panel de administración (`adm-`). |
| `revista.css` | Revista (`rv-`). |

#### Reglas para sumar pantallas nuevas

1. Usar siempre las **variables** (`var(--accent)`, `var(--line)`, `var(--r-md)`…), nunca colores o medidas sueltos.
2. **Una acción principal por pantalla**, en petróleo. Las secundarias van con botón secundario o fantasma.
3. Diseñar **primero para el celular** y después ampliar en `desktop.css` para PC, buscando poco scroll.
4. Reutilizar los componentes de `ui.jsx` (botones, hojas, campos, pills) antes de crear uno nuevo.
5. Revisar con capturas en varios tamaños. Por ejemplo: `node tests/shots.mjs --routes /ruta --sizes small,mobile,tablet,hd,fhd --metrics 1`. Ese comando también avisa si algo se desborda y mide cuánto scroll sobra.
