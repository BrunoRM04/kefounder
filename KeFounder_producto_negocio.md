# KeFounder! — Documento de Producto y Modelo de Negocio

## 1. Concepto general

**KeFounder!** es una plataforma de matching profesional orientada a personas que quieren crear, construir o sumarse a proyectos.

La idea toma la simplicidad de una aplicación de descubrimiento tipo Tinder, pero aplicada al mundo de:

- Founders.
- CEOs.
- Desarrolladores.
- Diseñadores.
- Product managers.
- Marketing.
- Ventas.
- Growth.
- Operaciones.
- Advisors.
- Otros perfiles vinculados a startups y nuevos proyectos.

El objetivo no es crear una bolsa de trabajo tradicional ni una red social profesional generalista.

KeFounder! debe resolver una pregunta concreta:

> **¿Con quién puedo construir mi próximo proyecto?**

Una persona puede ingresar porque tiene una idea, porque ya tiene un proyecto funcionando, porque necesita sumar un perfil específico o porque quiere incorporarse a un proyecto interesante.

---

# 2. Propuesta de valor

La propuesta central es simplificar al máximo la búsqueda de personas compatibles para trabajar juntas.

En lugar de revisar cientos de CV, publicaciones o perfiles extensos, el usuario ve una tarjeta clara y puede comprender en pocos segundos:

- Quién es la persona.
- Qué sabe hacer.
- Qué está construyendo.
- Qué busca.
- Cuánto tiempo puede dedicar.
- Si busca equity, remuneración o ambas.
- En qué etapa se encuentra el proyecto.
- Si existe compatibilidad entre ambas partes.

La experiencia debe sentirse rápida, moderna y simple.

La aplicación no debería parecer una plataforma de empleo.

Debe sentirse como una plataforma para **descubrir personas y proyectos**.

---

# 3. Tipos de usuarios

KeFounder! puede utilizarse desde diferentes perspectivas.

## Founder

Persona que tiene una idea, startup o proyecto y necesita encontrar personas para construirlo.

Ejemplos:

- Busca CTO.
- Busca desarrollador.
- Busca diseñador.
- Busca socio comercial.
- Busca alguien de marketing.

## Talento

Persona que tiene determinadas habilidades y quiere encontrar un proyecto.

Ejemplos:

- Developer buscando una startup.
- Diseñador buscando un proyecto paralelo.
- Marketer buscando incorporarse como socio.
- Estudiante buscando experiencia real.

## Equipo o startup

Proyecto que ya tiene varias personas y necesita continuar incorporando talento.

Ejemplo:

> Startup con CEO y CTO que necesita diseñador y responsable de Growth.

---

# 4. Principio de funcionamiento

La aplicación tiene dos grandes elementos:

## Personas

El usuario descubre personas que podrían ser compatibles con sus intereses.

## Proyectos

El usuario descubre proyectos a los que podría incorporarse.

Ambos utilizan el mismo sistema de interacción.

### Acciones principales

**Pasar**

El usuario no está interesado.

**Guardar**

Guarda el perfil o proyecto para revisarlo más adelante.

**Conectar**

Indica interés.

Si ambas partes muestran interés, se genera un match.

---

# 5. El Match

El sistema debe evitar que cualquier persona pueda enviar mensajes indiscriminadamente.

La lógica principal es:

1. Usuario A encuentra al Usuario B.
2. Usuario A presiona **Conectar**.
3. Usuario B recibe el interés.
4. Usuario B puede aceptar o rechazar.
5. Si acepta, se genera un **Match**.
6. Se habilita el chat.

Esto reduce spam y aumenta el valor de cada conversación.

También puede existir una cantidad limitada de mensajes directos para usuarios de planes superiores.

---

# 6. Arquitectura general de pantallas

La aplicación debería mantenerse pequeña y clara.

Las pantallas principales serían:

1. Onboarding.
2. Inicio / Descubrir.
3. Proyecto completo.
4. Perfil completo.
5. Matches.
6. Chat.
7. Guardados.
8. Mis proyectos.
9. Crear proyecto.
10. Perfil personal.
11. Filtros.
12. Notificaciones.
13. Suscripción.
14. Configuración.

---

# 7. Pantalla de onboarding

Es la primera experiencia del usuario.

Debe ser extremadamente corta.

## Pantalla 1 — Objetivo

Pregunta:

> ¿Qué estás buscando?

Opciones:

- Crear un proyecto.
- Encontrar un cofundador.
- Sumarse a un proyecto.
- Encontrar talento.
- Explorar.

---

## Pantalla 2 — Rol

Pregunta:

> ¿Qué hacés?

Opciones:

- Founder.
- CEO.
- Developer.
- Designer.
- Product.
- Marketing.
- Sales.
- Growth.
- Operations.
- Otro.

Se pueden seleccionar varios.

---

## Pantalla 3 — Disponibilidad

Pregunta:

> ¿Cuánto tiempo podés dedicar?

Opciones:

- Explorando.
- Menos de 10 horas semanales.
- 10–20 horas.
- 20–40 horas.
- Full time.

---

## Pantalla 4 — Tipo de oportunidad

Pregunta:

> ¿Qué tipo de propuesta te interesa?

Opciones:

- Equity.
- Remuneración.
- Remuneración + equity.
- Proyecto personal.
- Todavía no lo sé.

---

## Pantalla 5 — Perfil rápido

Datos:

- Nombre.
- Foto.
- Ciudad / país.
- Bio corta.
- Rol.
- Skills.
- LinkedIn opcional.
- GitHub opcional.
- Portfolio opcional.

Al finalizar se ingresa directamente a la pantalla de descubrimiento.

---

# 8. Pantalla principal — Descubrir

Esta es la pantalla más importante de KeFounder!

Debe ser la pantalla que el usuario vea al abrir la aplicación.

## Navegación superior

Dos modos:

**Personas**

**Proyectos**

El usuario puede alternar entre ambos.

---

# 9. Tarjeta de persona

La tarjeta debe poder entenderse en aproximadamente 5–10 segundos.

Debe contener:

- Foto.
- Nombre.
- Edad opcional.
- Ubicación.
- Rol principal.
- Skills principales.
- Nivel de disponibilidad.
- Qué busca.
- Tipo de compensación.
- Proyecto actual si tiene uno.
- Porcentaje de compatibilidad opcional.

Ejemplo:

> **Martín López**  
> Full Stack Developer  
> Montevideo, Uruguay  
>
> React · Node · PostgreSQL  
>
> Busca: startup SaaS o IA  
> 10–20 horas semanales  
> Equity o remuneración + equity

---

# 10. Tarjeta de proyecto

Debe contener:

- Nombre del proyecto.
- Logo o imagen.
- Descripción de una línea.
- Categoría.
- Etapa.
- Personas actuales del equipo.
- Qué perfiles busca.
- Dedicación requerida.
- Compensación.
- Ubicación o modalidad.
- Compatibilidad con el usuario.

Ejemplo:

> **ContaAI**
>
> Automatización contable mediante IA para pequeñas empresas.
>
> MVP
>
> Equipo: 2 personas
>
> Buscamos:
> - CTO.
> - Product Designer.
>
> Modalidad: Remoto  
> Compensación: Equity

---

# 11. Acciones de la pantalla principal

En la parte inferior:

### X — Pasar

Descarta la tarjeta.

### Guardar

Agrega la persona/proyecto a favoritos.

### Conectar

Envía interés.

También debería permitirse hacer swipe:

- Izquierda → Pasar.
- Derecha → Conectar.

La interfaz debe funcionar perfectamente sin utilizar swipe, especialmente en desktop.

---

# 12. Filtros

Los filtros son una de las funciones con mayor potencial de monetización.

## Filtros gratuitos

- Rol.
- País.
- Remoto / presencial.
- Tipo de oportunidad.

## Filtros avanzados

Disponibles en planes pagos.

- Skills.
- Años de experiencia.
- Industria.
- Etapa del proyecto.
- Disponibilidad semanal.
- Equity.
- Remuneración.
- Idiomas.
- Zona horaria.
- Nivel de experiencia.
- Tecnología utilizada.
- Tamaño del equipo.
- Proyecto con usuarios.
- Proyecto con facturación.
- Proyecto con inversión.

---

# 13. Pantalla Proyecto

Al seleccionar **Ver proyecto**, se abre una ficha completa.

Debe contener:

## Encabezado

- Logo.
- Nombre.
- Tagline.
- Industria.
- Ubicación.
- Sitio web opcional.

## Descripción

Explicación más extensa del proyecto.

## Problema

Qué problema busca resolver.

## Solución

Cómo lo resuelve.

## Estado

Ejemplo:

- Idea.
- Validación.
- Prototipo.
- MVP.
- Usuarios.
- Facturación.
- Inversión.

## Equipo

Personas que actualmente forman parte.

## Buscamos

Perfiles necesarios.

Ejemplo:

> CTO  
> Full time  
> Equity 15–25%

## Stack

Cuando corresponda:

- React.
- Node.
- Python.
- Flutter.
- PostgreSQL.
- AWS.

## Acciones

- Conectar.
- Guardar.
- Compartir.
- Reportar.

---

# 14. Pantalla Perfil

La ficha completa de una persona debe contener:

- Foto.
- Nombre.
- Rol.
- Ubicación.
- Bio.
- Skills.
- Experiencia.
- Disponibilidad.
- Intereses.
- Qué busca.
- Tipo de compensación.
- Proyectos.
- LinkedIn.
- GitHub.
- Portfolio.

También puede mostrar señales de confianza:

- Identidad verificada.
- LinkedIn conectado.
- GitHub conectado.
- Email verificado.
- Perfil completo.

No utilizaría estrellas ni puntuaciones públicas.

---

# 15. Pantalla Matches

Debe mostrar todas las conexiones generadas.

Cada match contiene:

- Foto.
- Nombre.
- Rol.
- Proyecto relacionado.
- Fecha del match.
- Último mensaje.

Estados posibles:

- Nuevo match.
- Conversación activa.
- Sin responder.
- Archivado.

En la parte superior puede aparecer:

> Nuevos matches

Y después:

> Conversaciones

---

# 16. Pantalla Chat

Debe ser extremadamente simple.

Funciones iniciales:

- Mensajes de texto.
- Compartir enlaces.
- Adjuntar archivos pequeños.
- Enviar proyecto.
- Ver perfil.
- Bloquear.
- Reportar.

Opcionalmente:

### Proponer reunión

Botón:

> Agendar videollamada

En una primera versión no es necesario construir calendario propio.

Puede simplemente permitir compartir disponibilidad o un enlace externo.

---

# 17. Pantalla Guardados

Dos pestañas:

- Personas.
- Proyectos.

Permite revisar perfiles interesantes sin haber enviado todavía una conexión.

Para usuarios gratuitos podría existir un límite.

Ejemplo:

> 10 guardados disponibles.

Los planes pagos pueden tener guardados ilimitados.

---

# 18. Mis proyectos

Pantalla desde la cual el founder administra sus proyectos.

Debe mostrar:

- Proyecto.
- Estado.
- Visualizaciones.
- Interesados.
- Matches.
- Fecha de creación.

Acciones:

- Editar.
- Pausar.
- Publicar.
- Duplicar.
- Ver estadísticas.

---

# 19. Crear proyecto

Crear un proyecto debe ser muy rápido.

## Paso 1

Nombre.

## Paso 2

Descripción corta.

## Paso 3

¿Qué problema resuelve?

## Paso 4

Etapa:

- Idea.
- Validación.
- MVP.
- Usuarios.
- Facturación.
- Inversión.

## Paso 5

¿Qué buscás?

Seleccionar perfiles.

Ejemplo:

- CTO.
- Frontend.
- Backend.
- Designer.
- Marketing.
- Sales.

## Paso 6

Dedicación.

## Paso 7

Compensación.

- Equity.
- Pago.
- Pago + equity.
- A conversar.

## Paso 8

Publicar.

---

# 20. Perfil personal

El usuario debe poder administrar:

- Foto.
- Nombre.
- Bio.
- Roles.
- Skills.
- Ubicación.
- Disponibilidad.
- Qué busca.
- Compensación esperada.
- Links.
- Proyectos.

También debería existir un indicador:

> Perfil 85% completo

Esto incentiva completar información.

---

# 21. Notificaciones

Ejemplos:

> Sofía quiere conectar contigo.

> Tenés un nuevo match.

> Martín guardó tu proyecto.

> Tu proyecto recibió 20 visitas esta semana.

> Encontramos 4 perfiles compatibles con tu búsqueda.

> Tenés un mensaje nuevo.

Las notificaciones de determinadas acciones pueden utilizarse para convertir usuarios gratuitos a planes pagos.

Ejemplo:

> 7 personas mostraron interés en vos.

El plan gratuito ve el número.

El plan Plus puede ver quiénes son.

---

# 22. Modelo de negocio

Inicialmente KeFounder! puede monetizarse exclusivamente mediante suscripciones.

El objetivo es mantener el producto sencillo.

No se necesitan:

- Publicidades.
- Comisiones.
- Marketplace.
- Venta de datos.
- Pagos por contratación.

El negocio se sostiene con una versión gratuita y tres niveles pagos.

---

# 23. Plan FREE

## Precio

**US$0**

## Objetivo

Permitir que cualquier persona pruebe el producto y pueda obtener valor real.

## Incluye

- Crear perfil.
- Descubrir personas.
- Descubrir proyectos.
- Crear 1 proyecto.
- Hasta 10 conexiones por día.
- Match.
- Chat.
- Filtros básicos.
- Hasta 10 guardados.
- Ver proyectos completos.

La versión gratuita debe ser suficientemente buena para generar comunidad.

---

# 24. Plan PLUS

## Precio sugerido

**US$4,99 por mes**

## Público

Usuarios que utilizan activamente KeFounder!

## Incluye

Todo lo incluido en Free más:

- Conexiones ilimitadas.
- Guardados ilimitados.
- Ver quién mostró interés.
- Ver quién guardó el perfil.
- Filtros avanzados.
- Historial de perfiles.
- Mayor cantidad de resultados.
- Sin límites diarios relevantes.

La función más atractiva puede ser:

> **Ver quién está interesado en vos.**

---

# 25. Plan PRO

## Precio sugerido

**US$9,99 por mes**

## Público

Founders y profesionales que están buscando activamente una persona o proyecto.

## Incluye

Todo Plus más:

- Mayor visibilidad del perfil.
- Mayor visibilidad de proyectos.
- Búsqueda avanzada.
- Recomendaciones prioritarias.
- Estadísticas de perfil.
- Estadísticas de proyecto.
- Compatibilidad avanzada.
- Mensajes directos limitados sin match.
- Hasta 3 proyectos activos.
- Perfil destacado dentro de determinadas búsquedas.

Ejemplo de estadísticas:

> 842 visualizaciones  
> 67 guardados  
> 21 intereses  
> 9 matches

---

# 26. Plan STARTUP

## Precio sugerido

**US$19,99 por mes**

## Público

Equipos y startups que necesitan incorporar varias personas.

## Incluye

Todo Pro más:

- Hasta 5 proyectos o búsquedas activas.
- Perfil de equipo.
- Varios integrantes.
- Panel de candidatos.
- Estadísticas completas.
- Gestión de interesados.
- Búsqueda avanzada de talento.
- Prioridad en resultados.
- Página pública opcional.
- Varios administradores en una futura versión.

---

# 27. Tabla de suscripciones

| Función | Free | Plus | Pro | Startup |
|---|---:|---:|---:|---:|
| Precio mensual | US$0 | US$4,99 | US$9,99 | US$19,99 |
| Perfil | Sí | Sí | Sí | Sí |
| Descubrir personas | Sí | Sí | Sí | Sí |
| Descubrir proyectos | Sí | Sí | Sí | Sí |
| Conexiones | 10/día | Ilimitadas | Ilimitadas | Ilimitadas |
| Match + chat | Sí | Sí | Sí | Sí |
| Guardados | 10 | Ilimitados | Ilimitados | Ilimitados |
| Ver interesados | No | Sí | Sí | Sí |
| Filtros avanzados | No | Sí | Sí | Sí |
| Analytics | No | No | Sí | Sí |
| Proyectos activos | 1 | 1 | 3 | 5 |
| Visibilidad prioritaria | No | No | Sí | Sí |
| Mensaje sin match | No | No | Limitado | Sí |
| Perfil de equipo | No | No | No | Sí |

---

# 28. Suscripciones anuales

También deberían existir planes anuales.

Propuesta:

## Plus

US$49/año.

## Pro

US$99/año.

## Startup

US$199/año.

La diferencia debe comunicarse como ahorro respecto al pago mensual.

---

# 29. Pantalla de suscripción

La pantalla no debería parecer agresiva.

Encabezado:

> **Encontrá a la persona correcta más rápido.**

Después mostrar los planes.

El plan recomendado puede ser **Pro**.

Cada plan debería tener máximo 5 o 6 beneficios destacados.

Ejemplo:

### Free

Para descubrir KeFounder!

### Plus

Para conectar sin límites.

### Pro

Para buscar activamente.

### Startup

Para construir un equipo.

Botones:

> Continuar con Free

> Elegir Plus

> Elegir Pro

> Elegir Startup

---

# 30. Cuándo mostrar el paywall

No debe aparecer apenas el usuario ingresa.

Debe aparecer cuando existe intención.

Ejemplos:

### Caso 1

El usuario intenta realizar su conexión número 11.

> Alcanzaste el límite diario.

### Caso 2

Recibe:

> 6 personas están interesadas en vos.

Presiona para descubrirlas.

> Disponible con Plus.

### Caso 3

Intenta utilizar un filtro avanzado.

> Disponible con Plus.

### Caso 4

Un founder quiere ver estadísticas.

> Disponible con Pro.

Esto convierte mejor porque el usuario entiende inmediatamente qué valor está pagando.

---

# 31. Diseño general

La identidad debería ser ultra minimalista.

## Colores

Base:

- Blanco.
- Negro.
- Gris muy claro.
- Gris medio.

Puede existir un único color de acento muy controlado.

Evitar múltiples colores saturados.

## Tipografía

Sans serif moderna.

Ejemplos de estilo:

- Inter.
- Geist.
- SF Pro.
- Manrope.

## Componentes

- Bordes suaves.
- Sombras mínimas.
- Mucho espacio blanco.
- Botones grandes.
- Muy pocos iconos simultáneamente.
- Jerarquía tipográfica clara.

---

# 32. Filosofía UX

Cada pantalla debe responder una sola pregunta.

Ejemplos:

### Descubrir

> ¿Me interesa esta persona?

### Proyecto

> ¿Quiero formar parte de esto?

### Perfil

> ¿Quiero trabajar con esta persona?

### Matches

> ¿Con quién puedo conversar?

### Chat

> ¿Podemos trabajar juntos?

Evitar dashboards llenos de información innecesaria.

---

# 33. Navegación

## Desktop

Barra lateral:

- Descubrir.
- Matches.
- Guardados.
- Mis proyectos.
- Perfil.

En la parte inferior:

- Plan.
- Configuración.

## Mobile

Barra inferior:

- Descubrir.
- Matches.
- Guardados.
- Proyectos.
- Perfil.

La aplicación debe diseñarse principalmente pensando en mobile.

---

# 34. MVP recomendado

La primera versión debería contener solamente lo necesario para probar si las personas realmente quieren utilizar el producto.

## MVP

- Registro.
- Login.
- Onboarding.
- Perfil.
- Crear proyecto.
- Descubrir personas.
- Descubrir proyectos.
- Pasar.
- Guardar.
- Conectar.
- Match.
- Chat.
- Filtros básicos.
- Suscripciones.
- Plus.
- Pro.
- Startup.

No construir inicialmente:

- IA compleja.
- Videollamadas.
- Eventos.
- Comunidades.
- Feed social.
- Recruiters.
- Marketplace.
- Sistema de reputación avanzado.
- Integraciones complejas.

Primero hay que validar el comportamiento principal:

> **¿Las personas encuentran otras personas con las que realmente quieren construir algo?**

---

# 35. Métricas importantes

Las métricas principales deberían ser:

## Activación

Porcentaje de usuarios que completa su perfil.

## Descubrimiento

Cantidad de perfiles vistos por usuario.

## Interés

Cantidad de conexiones enviadas.

## Match rate

Porcentaje de conexiones que terminan en match.

## Conversación

Porcentaje de matches que genera al menos un mensaje.

## Retención

Usuarios que regresan semanalmente.

## Conversión

Usuarios Free que pasan a Plus, Pro o Startup.

## Resultado real

La métrica más importante a largo plazo:

> Personas que encontraron colaborador, socio o equipo mediante KeFounder!

---

# 36. Posicionamiento

KeFounder! no debería comunicarse como una bolsa de trabajo.

Tampoco debería limitarse a cofounders.

El posicionamiento puede ser:

> **Encontrá a las personas para construir lo próximo.**

O:

> **Meet the people you'll build with.**

O:

> **Ideas need people. Find yours.**

---

# 37. Diferencia frente a otras plataformas

LinkedIn está orientado a redes profesionales.

Las bolsas de trabajo están orientadas a empleo.

Las comunidades de founders están orientadas a networking.

KeFounder! debería ocupar el espacio entre esas categorías:

> **Descubrimiento rápido de personas compatibles para construir proyectos.**

La interfaz tipo swipe es solamente el mecanismo.

El verdadero producto es el sistema de compatibilidad entre:

- Personas.
- Skills.
- Proyectos.
- Disponibilidad.
- Ambición.
- Etapa.
- Compensación.
- Objetivos.

---

# 38. Visión futura

Aunque inicialmente el negocio se base únicamente en suscripciones, la plataforma puede evolucionar hasta convertirse en una infraestructura de creación de equipos.

Una persona podría entrar con una idea y progresivamente:

1. Encontrar cofundador.
2. Encontrar developer.
3. Encontrar diseñador.
4. Encontrar Growth.
5. Crear un equipo.
6. Continuar contratando.
7. Administrar sus búsquedas desde KeFounder!

Por eso el producto no debería posicionarse únicamente como:

> Encontrá un cofundador.

Sino como:

> **Encontrá a las personas con las que vas a construir.**

---

# 39. Resumen del negocio

## Producto

Aplicación de matching entre talento, founders y proyectos.

## Problema

Encontrar socios y talento para proyectos nuevos es lento, fragmentado y depende demasiado de contactos personales.

## Solución

Descubrimiento rápido mediante perfiles resumidos, proyectos claros, filtros y matches.

## Modelo

Suscripción Freemium.

## Planes

- Free — US$0.
- Plus — US$4,99.
- Pro — US$9,99.
- Startup — US$19,99.

## Usuario principal

Founder, developer, designer o profesional interesado en construir proyectos.

## Acción central

> Descubrir → Conectar → Match → Conversar → Construir.

## Filosofía

Simple, rápido y sin ruido.
