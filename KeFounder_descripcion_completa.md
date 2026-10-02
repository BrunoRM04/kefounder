# KeFounder! — Descripción completa del sitio

**Fecha de documentación:** 28 de septiembre de 2026.  
**Versión del proyecto:** 1.0.0.  
**Alcance:** descripción del producto y de las funciones presentes en el código, con su identidad visual, estructura técnica y límites actuales.

Este documento describe la implementación actual. El documento [KeFounder_producto_negocio.md](KeFounder_producto_negocio.md) contiene la propuesta de producto y negocio; una función planteada allí no debe interpretarse como implementada si no aparece en esta descripción. Las instrucciones rápidas de ejecución están en [README.md](README.md).

## Índice

1. [Qué es KeFounder!](#1-qué-es-kefounder)
2. [A quién está dirigido](#2-a-quién-está-dirigido)
3. [Cómo funciona el recorrido principal](#3-cómo-funciona-el-recorrido-principal)
4. [Pantallas y funcionalidades](#4-pantallas-y-funcionalidades)
5. [Compatibilidad y recomendaciones](#5-compatibilidad-y-recomendaciones)
6. [Planes y límites](#6-planes-y-límites)
7. [Identidad visual y colores](#7-identidad-visual-y-colores)
8. [Experiencia en celular y computadora](#8-experiencia-en-celular-y-computadora)
9. [Datos, backend y estructura técnica](#9-datos-backend-y-estructura-técnica)
10. [Demostración y alcance real](#10-demostración-y-alcance-real)
11. [Cómo abrir y ejecutar el sitio](#11-cómo-abrir-y-ejecutar-el-sitio)
12. [Validaciones realizadas](#12-validaciones-realizadas)
13. [Mapa de pantallas](#13-mapa-de-pantallas)
14. [Glosario](#14-glosario)

## 1. Qué es KeFounder!

KeFounder! es una plataforma para conectar **personas que quieren construir proyectos** con otras personas y oportunidades compatibles con sus objetivos, conocimientos y disponibilidad.

Su mensaje principal es:

> Encontrá a las personas con las que vas a construir.

El sitio combina descubrimiento mediante tarjetas, perfiles profesionales, presentación de proyectos, solicitudes de conexión, matches y conversaciones. La interacción con las tarjetas se inspira en las aplicaciones de swipe: cada persona puede pasar, guardar o conectar con una oportunidad. El contexto del producto es profesional y emprendedor.

La propuesta es ayudar a responder preguntas concretas:

- ¿Quién puede complementar mis habilidades para comenzar una startup?
- ¿Dónde encuentro un cofundador técnico, de diseño o de negocio?
- ¿Qué proyectos buscan un perfil como el mío?
- ¿Quién puede dedicar un tiempo parecido al que necesito?
- ¿Buscamos el mismo tipo de acuerdo: remuneración, equity o una combinación?
- ¿Cómo paso de descubrir a alguien a tener una conversación útil?

El producto permite explorar tanto **personas** como **proyectos**. Una persona puede tener un perfil, publicar proyectos y sumarse a oportunidades de otros usuarios.

## 2. A quién está dirigido

### 2.1. Founders y personas con una idea

Pueden presentar lo que quieren construir, indicar la etapa en la que se encuentran y buscar cofundadores o perfiles complementarios. También pueden descubrir personas antes de tener un proyecto completamente definido.

### 2.2. Talento que quiere sumarse a un proyecto

Developers, diseñadores y otros profesionales pueden mostrar sus habilidades, disponibilidad y preferencias de compensación, descubrir proyectos y expresar interés en participar.

### 2.3. Equipos y startups que buscan integrantes

Pueden publicar búsquedas con diferentes roles, explicar sus necesidades y gestionar a quienes manifiestan interés. Las funciones de equipo y el seguimiento de candidatos dependen del plan.

### 2.4. Personas que quieren explorar

También existe el objetivo de explorar: conocer qué se está construyendo, revisar perfiles y guardar oportunidades sin tener una decisión inmediata.

### 2.5. Perfiles disponibles

El catálogo actual contempla Founder, CEO, Developer, Designer, Product, Marketing, Sales, Growth, Operations y Otro. Una persona puede seleccionar más de un rol.

Los proyectos pueden buscar CTO, Cofounder, Frontend, Backend, Full stack, Mobile, Data / IA, Designer, Product, Marketing, Growth, Sales, Operations y Advisor.

Las industrias disponibles incluyen Fintech, IA, SaaS B2B, EdTech, HealthTech, Climate, Marketplace, E-commerce, AgroTech, LegalTech, Media, Gaming, Impacto social, Logística, PropTech, Turismo, Food y HR Tech.

## 3. Cómo funciona el recorrido principal

El recorrido central del producto es:

**Crear cuenta → completar perfil → descubrir → conectar → hacer match → conversar → coordinar una colaboración.**

### 3.1. Crear una cuenta y definir el perfil

La persona se registra y completa un asistente inicial. Esos datos sirven para presentar su perfil y calcular compatibilidad con otras personas y proyectos.

### 3.2. Descubrir personas o proyectos

Desde la pantalla principal puede alternar entre los dos modos de descubrimiento. Cada modo mantiene su propio mazo de tarjetas, para que cambiar de pestaña no mezcle personas con proyectos.

### 3.3. Elegir qué hacer con una tarjeta

| Acción | Resultado |
|---|---|
| Pasar | Descarta la oportunidad del recorrido actual. |
| Guardar | Conserva la persona o el proyecto para revisarlo después. |
| Conectar | Envía una solicitud de interés. |
| Volver | Deshace una acción reciente y recupera la tarjeta correspondiente cuando está disponible. |
| Abrir la ficha | Muestra el perfil o proyecto con más información. |

Guardar y conectar tienen propósitos diferentes: un guardado permite revisar algo después; una conexión comunica interés al otro usuario.

### 3.4. Crear un match

Cuando el interés es mutuo o una solicitud es aceptada, se crea un match y se habilita una conversación. Las personas que ya manifestaron interés pueden aparecer primero en el descubrimiento, facilitando conexiones recíprocas.

Los planes Pro y Startup también contemplan mensajes directos sin esperar un match, con los límites descritos en la sección de planes.

### 3.5. Conversar y avanzar

Las personas pueden intercambiar mensajes, documentos, enlaces, fichas de proyectos y propuestas de reunión. KeFounder! facilita ese contacto; los acuerdos de trabajo, contratación o participación se definen entre las partes.

## 4. Pantallas y funcionalidades

### 4.1. Bienvenida (landing)

La pantalla pública es una landing minimalista, con todo el contenido centrado y sin secciones adicionales:

- Marca KeFounder! arriba y © 2026 KeFounder! abajo.
- Título **Encontrá tu próximo…** con una palabra que rota con transición de desenfoque: cofundador, developer, diseñador, proyecto y equipo.
- Una línea de propuesta: personas y proyectos que quieren construir algo nuevo; si el interés es mutuo, es match.
- Botones **Crear mi cuenta** e **Ingresar**.
- Accesos rápidos a las cuentas de demostración en una sola línea («Probá la demo con Sol o Martín») cuando está habilitado el modo demo.

Los elementos entran de forma escalonada (aparición con desenfoque), el fondo tiene dos halos de color que se desplazan lentamente y un anillo fino con un punto que orbita. Al elegir una opción, la landing se desvanece antes de abrir Ingresar o Registro, que a su vez entran con una transición suave. Si el sistema tiene activada la reducción de movimiento, las animaciones se omiten.

### 4.2. Registro e inicio de sesión

El registro solicita nombre, email y contraseña. La contraseña debe tener al menos ocho caracteres. El backend valida los datos y evita registrar un email que ya exista.

El inicio de sesión utiliza email y contraseña. Una cuenta que todavía no terminó el asistente inicial es dirigida al onboarding antes de utilizar las pantallas privadas.

Existe cierre de sesión y mantenimiento de sesión mediante una cookie. El cambio de contraseña se realiza desde Configuración.

**Alcance actual:** no hay inicio de sesión con Google o LinkedIn, recuperación de contraseña por email ni envío de correos de verificación implementados.

### 4.3. Onboarding en cinco pasos

El asistente inicial tiene una barra de progreso, permite retroceder entre pasos y conserva el avance en el navegador para poder retomarlo.

| Paso | Información |
|---|---|
| 1. Objetivo | Crear un proyecto, encontrar un cofundador, sumarse a un proyecto, encontrar talento o explorar. |
| 2. Roles | Qué hace la persona; permite elegir más de un rol. |
| 3. Disponibilidad | Explorando, menos de 10 horas, 10–20 horas, 20–40 horas semanales o full time. |
| 4. Propuesta deseada | Equity, remuneración, remuneración + equity, proyecto personal o todavía no lo sé. |
| 5. Perfil rápido | Nombre, foto, rol principal, ciudad, país, bio, skills y enlaces opcionales. |

El perfil rápido contempla enlaces a LinkedIn, GitHub y portfolio. Al finalizar, se guarda el perfil en el backend y se abre Descubrir.

La conservación del formulario incompleto en el navegador es distinta de la persistencia del perfil: los datos definitivos se guardan en la base al completar el proceso.

### 4.4. Descubrir

Es la pantalla principal de exploración. Tiene dos modos: **Personas** y **Proyectos**.

#### Tarjetas de personas

Presentan foto o fondo de marca, nombre, edad cuando está habilitada, ubicación, rol principal, señales de presencia, qué busca la persona, disponibilidad y compensación. También muestran el porcentaje de compatibilidad cuando corresponde. Las habilidades y los motivos detallados se consultan al abrir el perfil completo.

#### Tarjetas de proyectos

Presentan portada o fondo de marca, nombre, descripción corta, etapa, perfiles buscados, dedicación, compensación y modalidad. La industria y los datos del founder se consultan en la ficha completa. La compatibilidad se calcula respecto de la persona que está explorando.

#### Gestos y controles

- Deslizar hacia la izquierda: pasar.
- Deslizar hacia la derecha: conectar.
- Deslizar hacia arriba: guardar.
- Utilizar los botones visibles: volver, pasar, guardar y conectar.
- En computadora, utilizar los atajos de teclado: flechas izquierda, arriba y derecha, y Backspace para volver.

Los gestos conviven con el desplazamiento vertical de la pantalla. Los botones permiten realizar las acciones sin depender del swipe: Volver, Pasar, Guardar y Conectar tienen exactamente el mismo diámetro en cada tamaño de pantalla. La tarjeta de descubrimiento muestra un resumen breve; las habilidades y demás detalles se consultan en la ficha completa.

#### Filtros y orden

El orden puede configurarse como **Para vos**, **Recientes** o **Activos**.

Los filtros básicos incluyen rol o perfil buscado, país, modalidad y tipo de oportunidad. Las modalidades contempladas son remoto, híbrido y presencial.

Los filtros avanzados, disponibles desde Plus, permiten afinar por skills o tecnologías, experiencia, industria y disponibilidad. En personas también se contemplan idiomas; en proyectos, etapa, tamaño de equipo y condiciones de tracción: usuarios, facturación e inversión.

La interfaz permite aplicar o limpiar filtros. Si no quedan resultados, muestra un estado vacío y opciones para ajustar la búsqueda.

### 4.5. Ficha detallada de una persona

Amplía la información de la tarjeta con bio, objetivos, habilidades, disponibilidad, compensación, modalidad, idiomas, experiencia, enlaces profesionales y proyectos asociados.

Incluye acciones para conectar, guardar y compartir el perfil, además de opciones de reporte y bloqueo. El detalle de compatibilidad avanzada está sujeto al plan.

Las señales de confianza pueden reflejar completitud, enlaces profesionales y datos de verificación registrados. No existe actualmente un proceso externo integrado para verificar identidad o enviar un correo de verificación; una insignia de un perfil demo no representa una comprobación externa real.

### 4.6. Ficha detallada y pública de un proyecto

La ficha puede presentar:

- Portada, logo, nombre y descripción corta.
- Industria, etapa y ubicación.
- Historia del proyecto: descripción, problema y solución.
- Modalidad de trabajo.
- Perfiles buscados, con dedicación y compensación por rol.
- Equity y notas cuando fueron cargados.
- Tecnologías utilizadas.
- Founder y equipo, según la información y el plan disponibles.
- Indicadores declarados de usuarios, facturación e inversión.
- Sitio web y acciones para guardar, compartir o manifestar interés.

La ruta `/p/:id` también permite ver públicamente un proyecto publicado sin iniciar sesión. Para realizar acciones personales, como conectar o guardar, se necesita una cuenta.

Las condiciones y cifras declaradas por el founder son información del proyecto; el sitio no realiza una auditoría financiera ni valida acuerdos de equity.

### 4.7. Matches

Reúne los nuevos matches y las conversaciones. Incluye búsqueda por persona o proyecto, vistas **Todos**, **Sin responder**, **Activos** y **Archivados**, previsualización del último mensaje y señales de actividad o mensajes pendientes.

También presenta accesos a interesados y al descubrimiento. Una conversación puede archivarse y restaurarse. Archivar organiza la bandeja sin eliminar los mensajes.

En escritorio, la bandeja puede mostrar la lista de conversaciones junto al chat. En celular, la lista y la conversación se muestran en pantallas separadas para facilitar la lectura.

### 4.8. Chat en tiempo real

El chat está conectado al backend y persiste los mensajes. La comunicación de eventos utiliza **Server-Sent Events (SSE)**.

Tiene las siguientes funciones:

- Enviar y recibir mensajes de texto.
- Ver el indicador de que la otra persona está escribiendo.
- Mostrar estados de lectura.
- Consultar mensajes anteriores.
- Mantener el borrador de una conversación durante el uso de la aplicación.
- Identificar mensajes pendientes o fallidos y permitir reintentar el envío.
- Utilizar sugerencias para iniciar una conversación.
- Adjuntar archivos e imágenes.
- Compartir enlaces con un comentario.
- Enviar la ficha de un proyecto propio.
- Proponer una reunión.
- Abrir el perfil de la otra persona y el proyecto relacionado.
- Editar o eliminar mensajes propios: al tocar un mensaje propio aparecen **Editar** (solo texto) y **Eliminar**. El cambio se ve en vivo del otro lado; un mensaje editado muestra la marca «editado» y uno eliminado queda como «Mensaje eliminado». Si la notificación del otro lado todavía no se leyó, también se actualiza.
- Archivar, **deshacer el match**, reportar o bloquear desde las opciones de la conversación. Deshacer el match borra la conversación para ambos y evita que vuelvan a cruzarse en Descubrir.

#### Archivos

El backend permite imágenes JPEG, PNG, WebP y GIF; PDF; texto; ZIP; documentos Word; hojas Excel y presentaciones PowerPoint, incluidos sus formatos modernos.

El límite actual es **5 MiB por archivo** y **120 subidas por usuario en una ventana de 24 horas**. Se valida el tipo permitido y, para determinados formatos, la firma del archivo. HTML y SVG no están habilitados como adjuntos.

Los controles de foto de perfil, portada y logo ofrecen sus propias opciones de imagen; no todos los formatos del chat se ofrecen en esos selectores.

#### Reuniones

Se pueden sugerir hasta tres horarios, seleccionar una duración de 15, 30, 45 o 60 minutos, agregar un enlace de videollamada o agenda y escribir un mensaje.

La propuesta se comparte dentro del chat. No crea automáticamente una cita en un calendario externo ni genera una sala de videollamada. Los enlaces se aportan manualmente.

### 4.9. Interesados

Permite revisar quién manifestó interés, conocer su perfil y aceptar o rechazar solicitudes. Las solicitudes pueden estar relacionadas con una persona o un proyecto.

Con Free se muestran el conteo y una presentación limitada que oculta la identidad de los interesados. Desde Plus se habilita su visualización y gestión. También se contempla la consulta de quién guardó el perfil, sujeta al plan.

Aceptar una solicitud puede crear el match y abrir la posibilidad de conversar.

En la pestaña **Enviadas** se pueden **retirar** las solicitudes que todavía no terminaron en match. Lo mismo se puede hacer desde la ficha de la persona o del proyecto («Retirar mi interés»). Al retirarla, la otra persona deja de verla y se borra su notificación.

### 4.10. Guardados e historial

Guardados reúne personas y proyectos conservados para revisar después. Permite abrir sus fichas, quitar un guardado o conectar desde la lista.

El plan Free permite hasta diez guardados. Desde Plus, el límite se elimina.

El historial de perfiles y proyectos vistos está disponible desde Plus. Permite volver a oportunidades consultadas anteriormente sin depender de recordar su nombre.

### 4.11. Mis proyectos

Reúne los proyectos propios y muestra información de actividad, como proyectos activos, visualizaciones, interesados, matches y guardados.

Las acciones disponibles incluyen crear, editar, ver la ficha, publicar, pausar, volver a publicar cuando hay cupo, duplicar y eliminar. También permite acceder a estadísticas y candidatos según el plan.

Los estados principales son **Borrador**, **Publicado** y **Pausado**. Un borrador permite seguir trabajando sin aparecer en el descubrimiento público.

#### Asistente de creación en ocho pasos

| Paso | Contenido |
|---|---|
| 1 | Nombre e industria opcional. |
| 2 | Descripción corta del proyecto. |
| 3 | Problema que resuelve. |
| 4 | Etapa actual. |
| 5 | Perfiles buscados, hasta seis. |
| 6 | Dedicación requerida. |
| 7 | Compensación ofrecida. |
| 8 | Vista previa y decisión de publicar o guardar borrador. |

El asistente conserva el avance localmente. Si se intenta publicar sin cupo en el plan, la implementación puede guardar el proyecto como borrador e informar qué plan permite publicarlo.

#### Edición completa

Después de crear el proyecto se pueden completar o modificar portada, logo, descripción, problema, solución, industria, etapa, ubicación, modalidad, sitio web, stack y datos de tracción.

Cada perfil buscado puede tener su propia dedicación, compensación, equity y nota explicativa. La presentación de integrantes adicionales del equipo depende del plan Startup. Esa función no equivale a un sistema de permisos para que múltiples personas editen el proyecto.

#### Etapas disponibles

Idea, Validación, Prototipo, MVP, Usuarios, Facturación e Inversión. Estas etapas describen el avance del proyecto; son diferentes de los estados de publicación.

El usuario elige una etapa al crear un proyecto, en el cuarto paso del asistente. Después puede verla en la tarjeta de proyecto de Descubrir, en la ficha del proyecto y en la lista de **Mis proyectos**. Para cambiarla, debe abrir **Mis proyectos → Editar**, seleccionar **Etapa del proyecto** al comienzo del formulario y pulsar **Guardar cambios**. El control de **Visibilidad del proyecto** es independiente: Publicado, Pausado y Borrador indican si aparece en Descubrir, no su etapa de avance.

### 4.12. Estadísticas

Desde Pro se habilitan estadísticas de perfil y proyecto, con indicadores de visualizaciones, guardados, intereses y matches.

Las estadísticas de proyecto incluyen visualizaciones por día, información de conversión y distribución de perfiles interesados por rol. Las pantallas utilizan gráficos y estados vacíos cuando todavía no hay actividad suficiente.

Los datos provienen de registros del backend. En modo demostración pueden incluir actividad sembrada y acciones de perfiles simulados, por lo que no deben interpretarse como métricas de una comunidad real.

### 4.13. Candidatos

El seguimiento por etapas del proyecto está habilitado con Startup. Permite revisar perfiles interesados y organizar su avance:

| Etapa | Uso |
|---|---|
| Nuevo | Solicitud recién recibida. |
| En conversación | Se inició el intercambio. |
| Entrevista | La persona está en una instancia de evaluación. |
| Se sumó | Se registró que pasó a formar parte del proyecto. |
| Descartado | La candidatura no continúa. |

Se pueden filtrar las candidaturas por etapa y cambiar su estado. En PC, con Startup, se muestran como un tablero con una columna por etapa y cada candidato se arrastra a la etapa que corresponde. Ese estado organiza el seguimiento dentro del producto; no crea automáticamente contratos ni altas laborales.

### 4.14. Mi perfil y edición de perfil

La pantalla personal muestra nombre, foto, rol principal, ubicación, plan, señales de confianza, proyectos propios e indicador de completitud.

El indicador sugiere cómo enriquecer el perfil: agregar foto, bio, skills, ubicación, disponibilidad, enlaces o experiencia. Su porcentaje mide qué tan completo está el perfil, no su compatibilidad con otra persona.

La edición permite actualizar información personal y profesional, roles, skills, industrias de interés, disponibilidad, compensación, modalidad, idiomas, experiencia, edad y enlaces, entre los campos ofrecidos por el formulario.

Las estadísticas personales se habilitan según el plan.

### 4.15. Notificaciones

Existe un centro de notificaciones con eventos de conexiones, matches, mensajes y actividad. Permite abrir el destino relacionado, marcar notificaciones como leídas y **borrarlas** de a una o todas juntas.

La aplicación también presenta avisos durante el uso y actualiza información mediante eventos en tiempo real. Las preferencias se administran en Configuración.

Estas notificaciones pertenecen a la aplicación. No hay un proveedor de emails ni un sistema de notificaciones push del dispositivo integrado.

### 4.16. Configuración

Incluye:

- **Cuenta y verificación**: verificar el email con un código de 6 dígitos, verificar la identidad subiendo la foto de un documento y **cambiar el email** (con la contraseña). Al cambiar el email hay que volver a verificarlo. En modo demo el código se muestra en pantalla; fuera del modo demo se escribe en la consola del servidor. La identidad queda «En revisión» hasta que administración la aprueba o la rechaza; si se rechaza, la persona ve el motivo y puede enviar otra foto.
- Preferencias para solicitudes de conexión, nuevos matches, mensajes y actividad.
- Mostrar u ocultar el perfil en Descubrir.
- Mostrar u ocultar la edad.
- Volver a ver perfiles y proyectos que se habían pasado.
- Consultar y desbloquear personas bloqueadas.
- Cambiar contraseña.
- Cerrar sesión.
- Eliminar la cuenta con confirmación de contraseña.

Ocultar el perfil del descubrimiento mantiene disponibles los matches y chats existentes. Cambiar la contraseña invalida otras sesiones. La eliminación de cuenta es una acción definitiva que afecta el perfil y sus datos asociados.

### 4.17. Reportes y bloqueos

Se puede reportar un perfil falso o engañoso, spam o publicidad, comportamiento inapropiado, contenido ofensivo u otro motivo, agregando detalles opcionales.

Los reportes llegan a la cola de **Moderación** del panel de administración, por orden de llegada. Desde ahí se resuelven (sin sanción, ocultando el proyecto o suspendiendo la cuenta) o se descartan, siempre anotando la decisión. Quien reportó recibe un aviso cuando se revisa su reporte.

El bloqueo restringe la interacción y la visibilidad correspondiente entre usuarios. Si ambas personas se bloquearon, una sola no puede revertir el bloqueo que mantiene la otra.

### 4.18. Revista KeFounder!

La revista es un diario online público en `/revista`: cualquiera la lee sin crear una cuenta. En la bienvenida se entra con el botón «Leé la Revista KeFounder!», debajo de las cuentas de demostración. Es el único acceso: dentro de la app no aparece.

Tiene su propia cabecera, con la fecha, la búsqueda y las secciones Portada, Entrevistas, Startups, Founders, Inversión y Ecosistema. La portada reúne la nota destacada, lo último, una frase destacada, las entrevistas, un bloque por sección y lo más leído de los últimos 30 días; al final de cada página, a todo el ancho, invita a crear una cuenta. Cada nota muestra sección, título, bajada, firma, fecha, tiempo de lectura, foto, ficha de la persona protagonista, el texto con preguntas y respuestas, citas e imágenes, los temas, el proyecto vinculado en KeFounder! (si tiene página pública), botones para compartir y notas relacionadas. Al compartir el enlace, la vista previa en WhatsApp, LinkedIn o X muestra el título, el resumen y la foto.

Las notas se escriben y publican desde el panel de administración (Contenido → Revista). Se pueden guardar como borrador, ver con el diseño real antes de publicar, publicar al instante o programar para una fecha, poner en la portada, despublicar y eliminar con motivo. Cada nota registra sus lecturas por día: una por persona cada 6 horas, sin contar las visitas de administración.

En modo demo hay diez notas de ejemplo sobre las personas y los proyectos ficticios de la demostración, marcadas como ejemplo; se pueden quitar todas juntas desde el panel.

### 4.19. Difusión en la Revista e Instagram

Los planes Pro y Startup incluyen difusión: KeFounder! publica a la startup en su revista y en su Instagram.

- **Pro:** una mención en una nota colectiva y en las historias, una vez por semestre.
- **Startup:** una nota propia (entrevista o perfil) y una publicación en el feed, una vez por trimestre.

La startup la pide desde «Mis proyectos». Elige uno de sus proyectos publicados y cuenta qué quiere comunicar, quién habla, su Instagram, su web y un contacto. Ahí mismo sigue cada pedido: pendiente, en preparación, publicado (con los enlaces a la nota y al posteo) o rechazado (con el motivo).

Si un pedido se rechaza o se cancela antes de que se tome, el cupo vuelve. El equipo gestiona los pedidos desde la sección Difusión del panel de administración, que puede crear el borrador de la nota con los datos del pedido. En la revista, esas notas llevan la marca «Difusión».

### 4.20. Panel de administración

El panel vive en `/admin` y solo lo ve la cuenta de administración, que entra por la pantalla de ingreso normal y va directo ahí. Esa cuenta no tiene perfil público: no aparece en Descubrir ni puede recibir conexiones.

Tiene su propio menú lateral, agrupado en tres partes:

- **Panorama**: Resumen (indicadores, tendencia, pendientes, activación, planes y últimos registros), Métricas (siete métricas diarias en 7, 30 o 90 días, embudo de activación y distribuciones) e Ingresos (MRR, ARR, ticket promedio, altas y bajas, ingreso por plan y movimientos).
- **Gestión**: Usuarios (lista y ficha completa con acciones), Proyectos (lista, ficha y moderación), Moderación (reportes y verificación de identidad) y Seguimiento (tareas con vencimiento y notas internas).
- **Contenido**: Revista (notas, entrevistas y noticias, con editor, programación y lecturas) y Difusión (pedidos de las startups para salir en la revista e Instagram).
- **Control**: Auditoría (registro de todas las acciones del panel) y Sistema (estado de la base, copias de seguridad, integridad y mantenimiento).

Las listas se filtran, ordenan y paginan en el servidor; los filtros quedan en la dirección para poder guardarlos o compartirlos. Las métricas separan las cuentas reales de las de demostración. Cada acción que cambia algo pide un motivo cuando corresponde y queda en la auditoría. Las cuentas de administración se crean y administran desde la consola (`npm run admin`), y su contraseña nunca se guarda en archivos.

Una cuenta suspendida no puede ingresar, se cierran sus sesiones y desaparece de Descubrir, de los perfiles y de las páginas de proyectos. Un proyecto oculto por moderación deja de aparecer en Descubrir y en su enlace público; su founder lo ve marcado en «Mis proyectos» y recibe una notificación con el motivo.

## 5. Compatibilidad y recomendaciones

La compatibilidad se calcula en el servidor a partir de los datos de perfiles y proyectos. Es un sistema de reglas y ponderaciones; no utiliza un modelo de inteligencia artificial externo.

### 5.1. Entre personas

Evalúa objetivos, roles complementarios, coincidencia con perfiles que buscan los proyectos del usuario, disponibilidad, compensación, industrias de interés, ubicación e idiomas. Las habilidades complementarias también pueden aportar motivos explicativos.

Por ejemplo, un founder que busca talento técnico puede recibir una recomendación de alguien que quiere sumarse a un proyecto, tiene rol Developer y dispone de una dedicación compatible.

### 5.2. Entre una persona y un proyecto

Evalúa si el proyecto busca su perfil, la intención de la persona, coincidencias de stack y skills, dedicación, compensación, industria y modalidad o ubicación. La etapa puede aportar contexto a la explicación.

### 5.3. Cómo se presenta

Las tarjetas muestran un porcentaje acompañado de razones. Desde Pro se habilita el desglose avanzado.

El porcentaje es una orientación basada en la información cargada. No garantiza que una colaboración funcione ni reemplaza conversar sobre expectativas, experiencia o acuerdos.

## 6. Planes y límites

El catálogo implementado tiene cuatro planes: Free, Plus, Pro y Startup. Los precios se muestran en dólares estadounidenses.

### 6.1. Precios configurados

| Plan | Precio mensual | Precio anual |
|---|---:|---:|
| Free | US$0 | US$0 |
| Plus | US$4,99 | US$49 |
| Pro | US$9,99 | US$99 |
| Startup | US$19,99 | US$199 |

**El checkout actual es de demostración: cambia el plan y registra la operación, pero no cobra dinero.** Estos son los valores del catálogo local al momento de documentar el proyecto.

### 6.2. Comparación funcional

| Función | Free | Plus | Pro | Startup |
|---|---|---|---|---|
| Perfil y descubrimiento | Sí | Sí | Sí | Sí |
| Match y chat | Sí | Sí | Sí | Sí |
| Conexiones diarias | 10 | Ilimitadas | Ilimitadas | Ilimitadas |
| Guardados | 10 | Ilimitados | Ilimitados | Ilimitados |
| Proyectos activos | 1 | 1 | 3 | 5 |
| Filtros básicos | Sí | Sí | Sí | Sí |
| Filtros avanzados | No | Sí | Sí | Sí |
| Ver interesados y quién guardó el perfil | No | Sí | Sí | Sí |
| Ver candidatos de los proyectos propios | No | Sí | Sí | Sí |
| Historial | No | Sí | Sí | Sí |
| Estadísticas | No | No | Sí | Sí |
| Compatibilidad avanzada | No | No | Sí | Sí |
| Prioridad de visibilidad | No | No | Alta | Máxima |
| Mensajes directos sin match por mes | 0 | 0 | 5 | Ilimitados |
| Seguimiento de candidatos por etapas | No | No | No | Sí |
| Perfil de equipo | No | No | No | Sí |

Los límites de proyectos activos se refieren a proyectos publicados. Un proyecto puede mantenerse como borrador sin publicarse.

### 6.3. Pantalla de planes y cambios de suscripción

Incluye elección de período mensual o anual, comparación de beneficios, precio, plan actual, historial de operaciones y cancelación. El plan actual se puede pasar de mensual a anual (o al revés) desde la misma tarjeta. La tabla comparativa se genera desde el catálogo compartido, así que muestra exactamente lo que habilita el servidor.

Cuando se alcanza un límite o se solicita una función restringida, se muestra una explicación y la opción de cambiar de plan.

Si se baja a un plan con menos cupo, el backend pausa los proyectos publicados que exceden el límite, conservando publicados los más recientemente actualizados dentro del cupo. La cancelación implementada vuelve al plan Free de inmediato.

La fecha de renovación registrada en la demo no representa un cobro automático: no existe una integración de pagos que ejecute esa renovación.

## 7. Identidad visual y colores

La identidad actual combina **verde petróleo, salvia azulada, terracota y crema**, con texto oscuro. La paleta anterior fue reemplazada en la interfaz, incluidos navegación, chat, componentes, fondos de marca e íconos de instalación.

### 7.0. Logotipo e isotipo

- **Nombre:** KeFounder!, con el signo de exclamación como parte del nombre («¡Qué founder!»).
- **Isotipo:** una K cuyo tronco es un signo de exclamación. El punto terracota representa el momento del match, cuando dos personas se encuentran para construir. Tiene geometría firme y terminaciones redondeadas, para que se lea serio pero cercano. Funciona desde 16 px (favicon) hasta el ícono de la app.
- **Logotipo:** «KeFounder!» en Manrope ExtraBold convertida a trazos, con un «!» propio cuyo punto también es terracota. Se usa en petróleo sobre fondos claros y en crema sobre petróleo.
- **Dónde aparece:** isotipo en crema en la barra lateral de escritorio; logotipo en la barra superior, la landing, ingreso y registro, onboarding y la página pública de proyectos; isotipo en su cuadro petróleo en la pantalla de carga, el favicon y los íconos de instalación.
- **Archivos:** `public/brand/` (SVG y PNG, más la hoja de marca `kefounder-marca.png`). En el código, `src/components/Brand.jsx`.

### 7.1. Colores principales

| Color | HEX | Función principal |
|---|---|---|
| Verde petróleo | `#345F63` | Color principal de marca: botones, acciones destacadas, navegación de escritorio, enlaces y énfasis. |
| Salvia azulada | `#78999A` | Color secundario: iconografía auxiliar, indicadores de presencia, gráficos y detalles decorativos. |
| Terracota | `#C47F6A` | Acento cálido: punto del logotipo, avisos y acción de pasar, entre otros detalles. |
| Crema | `#F1EDE4` | Fondo general y texto claro sobre superficies oscuras de marca. |
| Texto oscuro | `#252A2A` | Texto principal, títulos y elementos que requieren contraste. |

El petróleo concentra la acción. El crema mantiene una base cálida. La salvia acompaña sin competir con el contenido y el terracota distingue detalles o decisiones secundarias.

### 7.2. Tonos de apoyo

Se utilizan variaciones relacionadas con los colores principales para diferenciar tarjetas, campos, separadores, estados y fondos sin introducir otra familia cromática.

| HEX | Uso |
|---|---|
| `#294D51` | Petróleo más oscuro para hover y estados de énfasis. |
| `#FBF8F2` | Superficies claras, tarjetas y formularios. |
| `#F5F1E9` | Superficies secundarias. |
| `#E9E9DF` | Fondos suaves y controles agrupados. |
| `#E3EAE4` | Fondos con un matiz suave de marca. |
| `#D4E0DA` | Selecciones y fondos de avatares o proyectos. |
| `#B7CAC6` | Bordes relacionados con el acento y barras de desplazamiento. |
| `#CFD8D2` | Separadores y bordes generales. |
| `#DFE3DA` | Bordes de menor énfasis y fondos auxiliares. |
| `#425859` | Texto secundario con matiz petróleo. |
| `#5D6F70` | Descripciones, ayudas y texto de menor jerarquía. |
| `#C9D8D6` | Texto claro secundario sobre petróleo y fondos de marca. |
| `#F0E1D8` | Fondos cálidos de avisos. |
| `#E2C4B7` | Bordes de la familia terracota. |
| `#935A48` | Texto cálido más oscuro para alertas y acciones sensibles. |
| `#E8D5CC` | Fondo cálido para avatares o portadas sin imagen. |

También existen versiones con transparencia para sombras, fondos sobre fotografías, modales y barras con desenfoque. Por ejemplo, `#252A2A66` es una versión translúcida del texto oscuro, no un color de otra familia.

### 7.3. Aplicación por componente

- **Botón principal:** petróleo con texto crema; petróleo más oscuro al pasar el cursor.
- **Botón secundario:** superficie clara con borde suave y texto oscuro.
- **Barra lateral de escritorio:** petróleo; opción activa clara y texto petróleo.
- **Barra inferior de celular:** superficie clara; navegación activa en petróleo.
- **Tarjetas y formularios:** crema y superficies derivadas con bordes suaves.
- **Chat:** mensajes propios con fondo suave de marca; otros mensajes sobre superficies claras.
- **Alertas:** fondos terracota claros con texto cálido oscuro.
- **Notificaciones:** detalles terracota; los números utilizan texto oscuro para mantener legibilidad.
- **Identidad de instalación:** cuadro petróleo con el isotipo en crema y el punto terracota.

Las fotografías conservan sus colores naturales. La paleta regula la interfaz y sus fondos; no recolorea las imágenes de personas y proyectos.

### 7.4. Contraste y legibilidad

Para textos pequeños se utilizan tonos oscuros. La salvia azulada se reserva principalmente para indicadores y detalles, mientras que los títulos destacados utilizan petróleo.

Las combinaciones revisadas durante el cambio de paleta incluyen:

| Combinación | Contraste aproximado |
|---|---:|
| Texto oscuro `#252A2A` sobre crema `#F1EDE4` | 12,45:1 |
| Crema `#F1EDE4` sobre petróleo `#345F63` | 6,07:1 |
| Texto secundario `#5D6F70` sobre crema `#F1EDE4` | 4,52:1 |
| Texto oscuro `#252A2A` sobre terracota `#C47F6A` | 4,57:1 |

Estas comprobaciones corresponden a esas combinaciones concretas; no representan una auditoría integral de accesibilidad de todas las pantallas.

### 7.5. Tipografía, formas y movimiento

La interfaz usa **DM Sans** para texto de lectura y controles, y **Manrope** para títulos, marca y énfasis. Tiene alternativas del sistema si esas fuentes no cargan.

El diseño utiliza tarjetas redondeadas, chips, botones circulares para las acciones de descubrimiento, sombras suaves, líneas finas y espacios que separan el contenido sin recargarlo.

Las animaciones acompañan la entrada de pantallas, el movimiento de las tarjetas y la celebración de un match. Hay estilos que reducen animaciones cuando el dispositivo solicita menos movimiento.

### 7.6. Dónde se mantiene la paleta

Los tokens principales están centralizados en [src/styles/base.css](src/styles/base.css). Los estilos de componentes y pantallas utilizan esas variables.

Los acentos de avatares y portadas sin imagen están definidos en [shared/theme.js](shared/theme.js). La normalización de acentos permite que los registros anteriores se presenten con la nueva identidad sin eliminar sus datos.

El manifest y los íconos se encuentran en [public/](public/). El color del navegador se declara también en [index.html](index.html).

## 8. Experiencia en celular y computadora

### 8.1. Celular

El diseño prioriza el uso móvil. Incluye navegación inferior con Descubrir, Matches, Guardados, Proyectos y Perfil; controles visibles para tocar; formularios en pasos; y separación entre bandeja y conversación.

Se contemplan áreas seguras del dispositivo y espacio para la barra inferior. El usuario puede desplazarse verticalmente y utilizar los gestos del descubrimiento.

### 8.2. Computadora

Desde 1100 px de ancho el sitio funciona como un software de pantalla completa: cada sección usa todo el ancho disponible y reparte el contenido en columnas para que se vea entera con poco scroll. En celular y tablet el diseño no cambia. Los estilos de escritorio están concentrados en [src/styles/desktop.css](src/styles/desktop.css).

| Sección | En PC |
|---|---|
| Descubrir | Ocupa exactamente la altura de la ventana, sin scroll. La tarjeta ajusta su tamaño a la pantalla; a la izquierda hay un panel con contexto y actividad y, desde 1280 px, a la derecha la columna **A continuación** con las próximas tarjetas del mazo (se abren sin perder el lugar). |
| Matches y chat | Lista y conversación a todo el ancho. Desde 1400 px se suma un panel con los datos de la otra persona y el proyecto del match. |
| Mi perfil | Tablero: identidad, perfil completo, plan y accesos a la izquierda; actividad, gráfico y secciones en grilla a la derecha. |
| Editar perfil y editar proyecto | Secciones en tres columnas, campos más compactos y el estado del proyecto junto a la opción de eliminarlo. |
| Candidatos (Startup) | Tablero con una columna por etapa; cada candidato se arrastra de una etapa a otra. |
| Fichas de persona y proyecto | Foto o portada fija a la izquierda, contenido en el centro y compatibilidad, datos y acciones a la derecha. En proyectos, el equipo y el stack pasan a la columna derecha. |
| Interesados, notificaciones, guardados, mis proyectos | Tarjetas en grilla de varias columnas. |
| Planes | Encabezado compacto, los cuatro planes en fila, suscripción e historial lado a lado y la comparación en dos tablas. |
| Configuración y estadísticas | Tarjetas en columnas; gráfico y detalle lado a lado. |
| Avisos vacíos o bloqueados | Centrados en la pantalla. |

Medición de scroll extra (cuánto más alta que la ventana es la página) en 1366×768 y 1920×1080: Descubrir, Matches, chat, candidatos, estadísticas, notificaciones, guardados y configuración, 0 %; Mis proyectos 14 % / 0 %; Interesados 22 % / 0 %; Mi perfil 37 % / 0 %; ficha de persona 28 % / 1 %; ficha de proyecto 39–43 % / 1 %; Planes 56 % / 7 %; editar perfil 79 % / 12 %; editar proyecto 93 % / 33 %. El script de capturas lo mide con `--metrics 1`.

Se ofrecen controles con mouse, estados de hover y atajos de teclado para el descubrimiento.

### 8.3. Acceso desde la pantalla de inicio

El proyecto incluye manifest e íconos para presentación tipo aplicación y accesos desde la pantalla de inicio. La disponibilidad de instalación depende del navegador y de las condiciones del entorno, como HTTPS.

No hay un service worker implementado ni funcionamiento completo sin conexión. El sitio necesita acceso al backend para las funciones persistentes, y las fotos externas y fuentes web necesitan internet para descargarse.

## 9. Datos, backend y estructura técnica

### 9.1. Frontend

El frontend utiliza **React 18**, **Vite 6**, componentes JSX, CSS dividido por áreas y **Lucide React** para iconografía. Las pantallas se cargan por demanda mediante imports diferidos.

Incluye componentes reutilizables para botones, campos, selectores, chips, avatares, logos, gráficos, modales, confirmaciones, indicadores de progreso, estados de carga y mensajes de error o éxito.

### 9.2. Backend

El backend utiliza **Node.js** y **Express 5**. El requisito declarado es Node.js 22.13 o superior. La persistencia utiliza SQLite mediante `node:sqlite`, sin requerir un servidor de base de datos independiente para la ejecución local.

La API tiene áreas para autenticación, perfiles, descubrimiento, proyectos, intereses, matches, notificaciones, planes y uploads. Los eventos en tiempo real se administran en el servidor.

### 9.3. Persistencia

La base conserva usuarios, sesiones, perfiles, proyectos, visualizaciones, acciones de pasar, guardados, solicitudes de interés, matches, mensajes, notificaciones, bloqueos, reportes, operaciones de suscripción y registros de archivos.

Los datos principales no dependen solamente de la memoria de React. Reiniciar el frontend no debería borrar los perfiles, mensajes o proyectos guardados en la base.

El navegador también conserva estados auxiliares, como preferencias o progreso de formularios. Esa información local no sustituye la base de datos.

### 9.4. Controles implementados

- Contraseñas almacenadas con hash mediante scrypt y sal.
- Sesiones mediante cookies HttpOnly y SameSite; Secure cuando corresponde al entorno HTTPS.
- Validaciones de registro, login, formularios y enlaces.
- Limitación de intentos de autenticación.
- Comprobación de permisos para acciones y acceso a recursos.
- Protección de origen para mutaciones.
- Límites por plan controlados en el backend.
- Restricción del acceso a conversaciones ajenas y de la edición de proyectos de otras personas.
- Validación de archivos y comprobación de propiedad de imágenes utilizadas en perfiles o proyectos.

Estos controles describen la implementación existente; no constituyen una certificación de seguridad o de preparación para producción.

### 9.5. Organización de archivos

```text
src/
  App.jsx              Pantallas, navegación y condiciones de acceso.
  screens/             Pantallas del producto.
  components/          Componentes visuales y funcionales reutilizables.
  lib/                 API, sesión, router, formato, medios y estado auxiliar.
  styles/              Tokens, componentes y estilos por área.

server/
  index.js             Arranque del servidor y publicación del frontend compilado.
  app.js               Configuración de Express y montaje de rutas.
  db.js                Base SQLite y operaciones de persistencia.
  auth.js              Autenticación y sesiones.
  compat.js            Reglas de compatibilidad.
  services.js          Operaciones compartidas, mensajes y notificaciones.
  serializers.js       Presentación de datos y normalización de acentos.
  realtime.js          Eventos en tiempo real.
  bots.js              Actividad simulada de cuentas demo.
  seed.js              Preparación de datos de demostración.
  seed-data.js          Catálogo de personas y proyectos de ejemplo.
  routes/              Endpoints por módulo.

shared/
  catalog.js           Opciones, planes, límites y textos compartidos.
  theme.js             Acentos de marca compartidos.

public/                Manifest e íconos.
tests/                 Pruebas de API, recorridos y capturas.
scripts/               Herramientas de ejecución.
data/                  Base de datos y archivos subidos.
dist/                  Frontend compilado.
```

## 10. Demostración y alcance real

### 10.1. Funciones conectadas al backend

Registro, login, edición de perfil, proyectos, guardados, solicitudes, matches, chat, archivos, notificaciones, configuración y controles de plan tienen implementación de backend y persistencia.

### 10.2. Perfiles de ejemplo y respuestas simuladas

La base inicial contiene cuentas y proyectos ficticios. Los perfiles demo pueden aceptar solicitudes, responder mensajes y generar actividad para permitir una prueba completa.

Esas respuestas se generan mediante lógica y textos programados. No son conversaciones con personas reales ni un asistente conectado a un modelo de IA externo.

Hay una cuenta de ejemplo por plan, con acceso de un clic desde la landing (contraseña `kefounder1234`):

| Cuenta | Plan | Qué muestra |
|---|---|---|
| `sol@kefounder.demo` — Sol Ortega | Free | Founder de ContaAI. Ve los bloqueos: interesados ocultos, sin estadísticas, filtros básicos, 10 conexiones y 10 guardados, 1 proyecto activo. |
| `ana@kefounder.demo` — Ana Rivas | Plus | Diseñadora. Ve quién la quiere y quién la guardó, filtros avanzados, historial de vistos y solicitudes enviadas para retirar. Sin estadísticas ni mensajes sin match. |
| `martin@kefounder.demo` — Martín López | Pro | Developer con el proyecto Formo. Estadísticas de perfil y proyecto, compatibilidad avanzada, lista de candidatos (sin etapas) y 1 de 5 mensajes sin match usados este mes. |
| `rodrigo@kefounder.demo` — Rodrigo Barrios | Startup | Founder de Brote. Dos búsquedas activas y un borrador, equipo de 4 integrantes, candidatos en todas las etapas del panel y una conversación iniciada sin match. |

El estado de esas cuentas puede cambiar después de usar el checkout de demostración o modificar sus perfiles; `npm run seed` las devuelve a su estado inicial. Si la base es anterior a una cuenta nueva, la landing solo ofrece las que existen.

La presencia y las señales de confianza de cuentas demo pueden formar parte de los datos simulados.

### 10.3. Pagos

El checkout funciona como simulación: registra el cambio de suscripción y habilita beneficios. No procesa tarjetas, transferencias ni cobros. Falta integrar un proveedor real y confirmar pagos mediante sus mecanismos de notificación.

### 10.4. Emails

No se envían emails. La verificación de email funciona con un código que, sin proveedor, se muestra en pantalla en modo demo y se escribe en la consola del servidor. La recuperación de contraseña todavía necesita un proveedor de email.

### 10.5. Otras funciones que no están integradas

- Calendarios externos y creación automática de reuniones.
- Videollamadas propias dentro del sitio.
- Notificaciones push del dispositivo.
- Funcionamiento completo sin conexión.
- Verificación externa de identidad (en modo demo se aprueba al subir el documento; en producción queda en revisión y falta un panel para aprobarla).
- Panel administrativo de moderación.
- Firma de contratos o gestión legal de equity.
- Liquidación de remuneraciones.
- Permisos de edición compartida entre integrantes de un equipo.

El sitio tampoco ha sido publicado por este trabajo en un dominio público. La ejecución descrita es local y puede exponerse a otros dispositivos de la misma red.

## 11. Cómo abrir y ejecutar el sitio

### 11.1. Ejecución local con frontend compilado

```bash
npm install
npm run build
npm start
```

`npm start` sirve tanto el frontend compilado como la API en el puerto 3000. No es necesario abrir dos puertos para utilizar esa modalidad.

En la computadora se abre:

```text
http://localhost:3000
```

En el celular se usa la IP local de la computadora y el mismo puerto. Por ejemplo:

```text
http://192.168.0.18:3000
```

La IP puede cambiar. El servidor muestra las direcciones al arrancar. Para utilizar esa dirección, la computadora debe permanecer encendida, el servidor debe estar activo y ambos dispositivos deben conectarse a una red que permita comunicarse entre sí.

El proyecto incluye `iniciar-kefounder.cmd` y `detener-kefounder.cmd` como accesos de ejecución para Windows. Si cambió el código y ya existe un build anterior, se debe volver a ejecutar `npm run build` para actualizarlo.

### 11.2. Desarrollo

```bash
npm run dev
```

Esta modalidad levanta la API en el puerto 3000 y Vite en el 5173. Vite permite ver cambios del frontend durante el desarrollo y redirige las solicitudes de API al backend.

### 11.3. Variables principales

| Variable | Valor predeterminado | Uso |
|---|---|---|
| `PORT` | `3000` | Puerto del backend. |
| `HOST` | `0.0.0.0` | Interfaz de escucha; permite acceso desde la red local. |
| `KEFOUNDER_DATA_DIR` | `./data` | Ubicación de la base y los archivos. |
| `KEFOUNDER_DEMO` | `1` | Mostrar accesos a cuentas de demostración. |
| `KEFOUNDER_DEMO_BOTS` | `1` | Activar actividad simulada de perfiles demo. |

Para desactivar las funciones demo se utilizan valores `0`. Ocultar accesos o apagar bots no elimina automáticamente los perfiles ficticios de una base existente.

## 12. Validaciones realizadas

Con el panel de administración, la revista y la difusión se completaron:

- Compilación del frontend con Vite.
- **88 pruebas automáticas**, sin fallos: 43 de la API (incluida una matriz que recorre cada función de cada plan con las cuatro cuentas de ejemplo), 24 del panel (permisos, suspensión, moderación, reportes, identidad, planes de cortesía, tareas, auditoría, exportación CSV, copias de seguridad y conservación de cuentas reales al reiniciar la demo) y 13 de la revista (lectura sin cuenta, borradores, publicación y programación, portada, imágenes, formato seguro, lecturas, datos para compartir y notas de ejemplo) y 8 de la difusión (beneficio por plan, cupos, pedido, cancelación, borrador, publicación, rechazo y avisos).
- **22 pasos de prueba en navegador**, sin fallos: 14 de la app, 5 del panel (creación de la cuenta por consola, resumen, plan de cortesía con motivo, tareas y búsqueda global, menú en celular) y 2 de la revista (entrar sin cuenta desde la bienvenida y leer una nota en el celular; escribir y publicar una nota desde el panel) y 1 de la difusión (pedirla desde Mis proyectos en el celular y tomarla desde el panel).
- Capturas del panel en 320, 375, 390, 820, 1024, 1280, 1366, 1536 y 1920 px de ancho.
- Capturas y revisión de desbordes horizontales en tamaños de celular y escritorio.
- Comprobación de respuesta del frontend y backend mediante la dirección local de red.
- Comprobación de los colores principales en el CSS servido y de los acentos de marca en respuestas de API.

Los recorridos de navegador incluyeron el panel de administración, registro y onboarding, acciones de descubrimiento, swipe, cambio entre personas y proyectos, paywalls y checkout demo, chat en tiempo real, propuesta de reunión, interesados, creación y edición de proyectos y match inmediato.

La comprobación móvil se realizó con tamaños y emulación en navegador. No representa una prueba física de todos los modelos de celular ni garantiza acceso desde redes diferentes.

Los comandos disponibles son:

```bash
npm test
npm run test:e2e
node tests/shots.mjs --out capturas --routes /,/matches --sizes small,mobile,hd,win,fhd --user ana
```

La prueba e2e requiere el frontend compilado y utiliza un servidor y base temporales. Las capturas se ejecutan contra un servidor activo.

## 13. Mapa de pantallas

En la tabla, `:id` representa el identificador de una persona, proyecto o conversación.

| Pantalla | Ruta | Acceso |
|---|---|---|
| Bienvenida | `/bienvenida` | Público. |
| Ingresar | `/ingresar` | Público. |
| Registro | `/registro` | Público. |
| Onboarding | `/onboarding` | Cuenta sin completar el perfil inicial. |
| Descubrir | `/` | Cuenta con onboarding completo. |
| Perfil de una persona | `/u/:id` | Autenticado. |
| Proyecto | `/p/:id` | Público para proyectos publicados; acciones personales autenticadas. |
| Matches | `/matches` | Autenticado. |
| Chat | `/chat/:id` | Participante de la conversación. |
| Interesados | `/interesados` | Autenticado; detalle sujeto al plan. |
| Guardados e historial | `/guardados` | Autenticado; historial sujeto al plan. |
| Mis proyectos | `/proyectos` | Autenticado. |
| Crear proyecto | `/proyectos/nuevo` | Autenticado. |
| Editar proyecto | `/proyectos/:id/editar` | Propietario del proyecto. |
| Estadísticas del proyecto | `/proyectos/:id/estadisticas` | Propietario; sujeto al plan. |
| Candidatos | `/proyectos/:id/candidatos` | Propietario; seguimiento por etapas sujeto al plan. |
| Mi perfil | `/perfil` | Autenticado. |
| Editar perfil | `/perfil/editar` | Autenticado. |
| Notificaciones | `/notificaciones` | Autenticado. |
| Planes | `/planes` | Autenticado. |
| Configuración | `/configuracion` | Autenticado. |
| Revista | `/revista`, `/revista/seccion/:id`, `/revista/buscar` y `/revista/:nota` | Público, sin cuenta. |
| Panel de administración | `/admin` y sus secciones (`/admin/metricas`, `/admin/ingresos`, `/admin/usuarios`, `/admin/proyectos`, `/admin/moderacion`, `/admin/seguimiento`, `/admin/revista`, `/admin/auditoria`, `/admin/sistema`) | Solo la cuenta de administración. |

Las restricciones se controlan también en el backend; conocer una ruta no concede acceso a datos o acciones ajenas.

## 14. Glosario

| Término | Significado dentro del sitio |
|---|---|
| Founder | Persona que impulsa o fundó un proyecto. |
| Cofounder | Persona que comparte la construcción del proyecto como cofundador. |
| Match | Conexión recíproca o aceptada que habilita una conversación. |
| Interés | Solicitud para conectar con una persona o un proyecto. |
| Swipe | Gesto de deslizamiento para actuar sobre una tarjeta. |
| Equity | Participación en un proyecto o empresa, declarada como propuesta. |
| Stack | Tecnologías y herramientas utilizadas por un proyecto. |
| MVP | Primera versión funcional que permite probar una propuesta. |
| Onboarding | Asistente inicial para configurar el perfil. |
| Paywall | Aviso que explica qué plan habilita una función o un límite mayor. |
| Pipeline | Etapas de seguimiento de una candidatura. |
| SSE | Canal del servidor al navegador para recibir eventos en tiempo real. |
| Persistencia | Conservación de información en la base para recuperarla después. |
