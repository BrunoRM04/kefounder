// Notas de ejemplo de la Revista KeFounder!, con las personas y proyectos ficticios de la demo.
// Se marcan como ejemplo (is_sample = 1): el panel las muestra así y las puede quitar todas juntas.

const U = (id) => `https://images.unsplash.com/photo-${id}`;

export const SAMPLE_ARTICLES = [
  {
    slug: 'sol-ortega-la-ia-no-reemplaza-al-contador',
    section: 'entrevistas',
    format: 'entrevista',
    featured: true,
    daysAgo: 0.2,
    views: 1840,
    title: 'Sol Ortega: «La IA no reemplaza al contador, le devuelve las tardes»',
    dek: 'La fundadora de ContaAI explica por qué eligió el problema más aburrido de las pymes, cómo validó con catorce estudios contables y qué perfil le falta para crecer.',
    cover: U('1454165804606-c3d57bc86b40'),
    person: { name: 'Sol Ortega', role: 'Founder & CEO', company: 'ContaAI', photo: U('1531123897727-8f129e1688ce') },
    project: 'ContaAI',
    tags: ['IA', 'Fintech', 'Uruguay'],
    body: `Sol Ortega pasó seis años del otro lado del mostrador: era la persona que, cada fin de mes, perseguía facturas por WhatsApp para cerrar la contabilidad de clientes chicos. De esa frustración nació **ContaAI**, un asistente que lee comprobantes, concilia cuentas y deja los reportes listos para que el contador solo revise.

Hoy la beta la usan catorce estudios contables de Montevideo y Sol busca a la persona que le falta: alguien que lidere la parte técnica.

P: ¿Por qué elegiste un problema que casi nadie quiere mirar?
R: Justamente por eso. Todo el mundo quiere hacer la app linda; nadie quiere pelearse con facturas en PDF escaneadas torcidas. Pero ahí está el dolor real: una pyme pierde entre diez y quince horas por mes cargando papeles. Ese tiempo vale plata y, sobre todo, vale tardes.

P: ¿Cómo validaste la idea antes de escribir una línea de código?
R: Hice el trabajo a mano. Durante dos meses fui "el robot": los estudios me mandaban los comprobantes y yo se los devolvía conciliados al día siguiente. Cuando tres de ellos me preguntaron cuánto les iba a cobrar, supe que había algo.

> Si nadie te pregunta cuánto cuesta, todavía no resolviste un problema.
> — Sol Ortega

P: ¿Qué hace exactamente la inteligencia artificial en ContaAI?
R: Reconoce el tipo de comprobante, extrae los datos y propone el asiento. El contador ve todo en una bandeja y aprueba con un clic. La IA no firma nada: propone. Esa decisión de diseño fue clave para que los estudios confiaran.

P: ¿Cuál fue el error más caro hasta ahora?
R: Querer cubrir todos los bancos desde el día uno. Perdimos un mes integrando entidades que usaban dos clientes. Ahora priorizamos por volumen real, no por lo que suena completo en una presentación.

## Lo que viene

P: ¿Qué perfil estás buscando?
R: Un CTO o una CTO que disfrute de los datos desordenados. Alguien que vea un PDF escaneado y piense "esto lo puedo ordenar". Ofrecemos equity y la posibilidad de construir el producto desde la base.

P: ¿Y cómo lo estás buscando?
R: Hablando con mucha gente. En KeFounder! ya tuve conversaciones muy buenas: lo que más me sirve es ver de entrada la disponibilidad y qué tipo de propuesta busca cada persona. Te ahorra semanas de cafés que no iban a ningún lado.

P: Un consejo para quien está por arrancar.
R: Enamorate del problema y desconfiá de tu solución. La primera versión de ContaAI era muy distinta a la de hoy, y está bien que así sea.`
  },
  {
    slug: 'rodrigo-barrios-brote-regar-menos',
    section: 'entrevistas',
    format: 'entrevista',
    daysAgo: 2.4,
    views: 1320,
    title: 'Rodrigo Barrios: «Regar menos fue el mejor modelo de negocio que encontramos»',
    dek: 'Desde Asunción, el fundador de Brote cuenta cómo pasó de instalar sensores en campos vecinos a armar un equipo de datos para predecir riego y cosecha.',
    cover: U('1625246333195-78d9c38ad449'),
    person: { name: 'Rodrigo Barrios', role: 'Founder & CEO', company: 'Brote', photo: U('1557862921-37829c790f19') },
    project: 'Brote',
    tags: ['AgroTech', 'Paraguay', 'Equipos'],
    body: `**Brote** nació en una charla de sobremesa. El padre de Rodrigo Barrios gastaba más en agua que en semillas y nadie sabía bien por qué. Tres años después, la empresa instala sensores de humedad que le dicen a cada productor cuándo y cuánto regar, y ya factura en Paraguay y el norte argentino.

P: ¿Cómo explicás Brote en una frase?
R: Sensores y datos para regar solo lo necesario. El productor ahorra agua y energía, y nosotros cobramos una parte de ese ahorro. Si no ahorra, no paga.

P: Cobrar por resultados es arriesgado.
R: Es lo que nos abrió la puerta. El productor rural desconfía, con razón, de la tecnología que le venden en una feria. Cuando le decís "si no funciona, no me pagás", la conversación cambia.

> El campo no te compra una app. Te compra una cosecha mejor.
> — Rodrigo Barrios

P: ¿Cuándo supiste que necesitabas un equipo y no solo socios?
R: Cuando empecé a ser el cuello de botella de todo. Instalaba, vendía, cobraba y arreglaba. Hoy somos ocho y el próximo paso es un equipo de datos que prediga riego y cosecha con meses de anticipación.

P: ¿Cómo estás armando ese equipo?
R: Con un tablero de candidatos por etapa: quién está en conversación, quién en entrevista, quién se sumó. Parece obvio, pero ordenar la búsqueda me devolvió horas. Y no descarto perfiles por la ciudad: trabajamos remoto con gente de Montevideo y de Lima.

## Aprendizajes

- Instalar el primer sensor gratis fue más barato que cualquier campaña.
- Los datos que más valen son los que el productor ya tenía y nadie miraba.
- Contratar lento y desvincular rápido, aunque duela.

P: ¿Qué le dirías a quien quiere hacer tecnología para el agro?
R: Que pase una semana en el campo antes de diseñar nada. Lo que se ve desde la ciudad casi nunca es el problema real.`
  },
  {
    slug: 'sofia-mendez-pulso-de-la-guardia-a-la-startup',
    section: 'founders',
    format: 'perfil',
    daysAgo: 4.1,
    views: 960,
    title: 'De la guardia a la startup: Sofía Méndez quiere que nadie espere tres meses para un control',
    dek: 'Médica clínica en Santiago, dejó las guardias para construir Pulso, una plataforma que acompaña a pacientes crónicos desde su casa.',
    cover: U('1576091160399-112ba8d25d1d'),
    person: { name: 'Sofía Méndez', role: 'Founder & CEO', company: 'Pulso', photo: U('1494790108377-be9c29b29330') },
    project: 'Pulso',
    tags: ['HealthTech', 'Chile', 'Founders'],
    body: `Durante años, Sofía Méndez vio el mismo patrón en la guardia: pacientes con hipertensión o diabetes que llegaban descompensados porque entre un control y otro pasaban meses. "No faltaban médicos, faltaba seguimiento", resume.

**Pulso** es su respuesta: un sistema de monitoreo remoto que reúne mediciones del paciente, detecta alertas tempranas y avisa al equipo de salud antes de que la situación sea una urgencia. El prototipo ya funciona con un grupo piloto en Santiago.

## Una médica aprendiendo a emprender

Sofía no venía del mundo de la tecnología. Aprendió a leer métricas de producto con la misma obsesión con la que antes leía análisis clínicos. "Lo más difícil fue aceptar que una primera versión imperfecta en manos de pacientes vale más que una perfecta en mi computadora", cuenta.

> En salud, llegar tarde no es un problema de experiencia de usuario: es un problema clínico.
> — Sofía Méndez

El equipo combina perfiles que rara vez se cruzan: una cardióloga asesora, una diseñadora que entrevistó a más de cuarenta pacientes y un desarrollador que antes trabajaba en pagos y aportó su experiencia en datos sensibles y cumplimiento.

## Lo que busca ahora

Pulso está en etapa de prototipo y su fundadora busca dos perfiles: alguien de producto que haya trabajado con datos de salud y un perfil técnico para escalar la plataforma. La propuesta combina pago y equity.

Su consejo para otros profesionales que piensan en emprender: "No dejes tu oficio. Usalo. Lo que sabés de tu trabajo es la ventaja que ningún inversor puede comprar".`
  },
  {
    slug: 'cinco-startups-que-buscan-cofundador',
    section: 'startups',
    format: 'analisis',
    daysAgo: 5.6,
    views: 1510,
    title: 'Cinco startups de la región que están buscando cofundador este mes',
    dek: 'De la cocina casera al plástico recuperado: proyectos en etapa temprana que ya validaron el problema y necesitan a la persona que falta.',
    cover: U('1522071820081-009f0129c71c'),
    tags: ['Startups', 'Cofundadores', 'Región'],
    body: `Encontrar a la persona correcta para construir es, para la mayoría de los founders, más difícil que encontrar inversión. Repasamos cinco proyectos de la comunidad de KeFounder! que tienen el problema validado y una silla vacía en la mesa fundadora.

## 1. Mesa · Buenos Aires

Un marketplace de cocineros caseros en tu barrio. Julieta Romero ya tiene cocineras activas y pedidos todas las semanas; lo que le falta es un CTO que lleve la plataforma a otra escala. *Busca:* CTO, con equity.

## 2. Marea · Punta del Este

Conecta a quienes recuperan plástico con marcas que quieren hacer las cosas mejor. Emiliano Ruiz está validando con recolectores de la costa y necesita alguien que diseñe una app muy simple para registrar entregas. *Busca:* diseño de producto y desarrollo mobile.

## 3. Campo Claro · Salto

Trazabilidad simple para productores ganaderos. Gonzalo Ferreira tiene un prototipo funcionando y conversaciones con frigoríficos. *Busca:* desarrollo full stack y alguien de ventas B2B.

## 4. Lumen · Buenos Aires

Contratos claros para freelancers, redactados con IA y revisados por abogados. Está en etapa de idea, con una lista de espera que crece sola. *Busca:* cofundador técnico con interés en LegalTech.

## 5. Kiosko · Rosario

Gestión de stock por WhatsApp para almacenes de barrio. Es el más avanzado de la lista: ya tiene usuarios que lo usan todos los días. *Busca:* growth y operaciones.

---

> Un cofundador no se contrata: se elige, y te elige.

¿Te interesa alguno? Todos tienen su proyecto publicado en KeFounder!: podés ver qué perfil buscan, en qué etapa están y conectar con quien lo fundó.`
  },
  {
    slug: 'orbita-primera-ronda-sin-dejar-de-facturar',
    section: 'inversion',
    format: 'entrevista',
    daysAgo: 7.2,
    views: 1170,
    title: 'Cómo Orbita levantó su primera ronda sin dejar de facturar',
    dek: 'Federico Blanco, de Orbita, repasa los números que le pidieron los fondos, los que no le pidieron y por qué llegó a la ronda con clientes que pagaban.',
    cover: U('1551288049-bebda4e38f71'),
    person: { name: 'Federico Blanco', role: 'Growth & Product', company: 'Orbita', photo: U('1522075469751-3a6694fb2f61') },
    project: 'Orbita',
    tags: ['Inversión', 'SaaS B2B', 'España'],
    body: `**Orbita** ofrece analytics de producto sin código para equipos pequeños. Desde Madrid y con un equipo repartido entre España y América Latina, la empresa cerró su primera ronda después de un año facturando. Hablamos con Federico Blanco sobre cómo llegaron a ese momento.

P: ¿Por qué esperar a facturar para levantar capital?
R: Porque queríamos negociar desde la tranquilidad y no desde la urgencia. Con clientes pagando, la pregunta del inversor deja de ser "¿alguien va a usar esto?" y pasa a ser "¿qué tan rápido puede crecer?". Es otra conversación.

P: ¿Qué números miraron con más atención?
R: Retención por cohorte, sin dudas. Nos preguntaron más por cuántos clientes seguían usando el producto al tercer mes que por la facturación total. También el tiempo que tardábamos en recuperar lo que costaba conseguir cada cliente.

> La mejor presentación para un fondo es una planilla que no necesita explicación.
> — Federico Blanco

P: ¿Y qué no les pidieron, aunque ustedes lo tenían preparado?
R: Proyecciones a cinco años. Nadie las miró en serio. Les importaba entender si el equipo sabía qué estaba pasando hoy y qué iba a hacer con la plata en los próximos dieciocho meses.

P: ¿Cuánto influyó el equipo en la decisión?
R: Muchísimo. Un fondo nos dijo que invertía en nosotros porque nuestras tres personas fundadoras se complementaban: producto, tecnología y ventas. Si hubiéramos sido tres perfiles iguales, probablemente no habríamos cerrado.

## Para quien está por salir a buscar inversión

- Llegá con una métrica que entiendas mejor que nadie.
- Hablá con founders que ya levantaron en ese fondo antes de la reunión.
- Pedí plazos claros: un "seguimos en contacto" sin fecha es un no.`
  },
  {
    slug: 'diego-castro-segunda-empresa',
    section: 'founders',
    format: 'entrevista',
    daysAgo: 9.5,
    views: 870,
    title: 'Diego Castro: «Mi segunda empresa la armé para no repetir los errores de la primera»',
    dek: 'Founder serial en Ciudad de México, Diego Castro dirige Ruta, una plataforma de rutas de última milla que ya factura con pymes de reparto.',
    cover: U('1553413077-190dd305871c'),
    person: { name: 'Diego Castro', role: 'Founder & CEO', company: 'Ruta', photo: U('1472099645785-5658abf4ff4e') },
    project: 'Ruta',
    tags: ['Logística', 'México', 'Founders'],
    body: `Diego Castro cerró su primera startup a los treinta y dos años. Tenía un buen producto, inversores entusiasmados y un equipo talentoso, pero nunca encontró un modelo que se sostuviera solo. Con **Ruta**, que optimiza recorridos de reparto para pymes, decidió hacer todo al revés.

P: ¿Qué cambiaste en la segunda empresa?
R: Empecé cobrando desde el primer cliente. En la primera empresa regalábamos el producto para crecer y nos convencimos de que eso era tracción. No lo era.

P: ¿Cómo elegiste a tu equipo esta vez?
R: Busqué gente distinta a mí. En la primera éramos todos ingenieros entusiasmados por la tecnología; nadie quería vender. Ahora la primera persona que sumé vino de ventas en logística y conoce a cada cliente por su nombre.

> El fracaso no te enseña nada si no escribís qué salió mal mientras todavía duele.
> — Diego Castro

P: ¿Qué hacés distinto con los inversores?
R: Les cuento los problemas antes que las buenas noticias. Un informe mensual corto: qué salió bien, qué salió mal y en qué necesito ayuda. Me sorprendió cuánto se involucran cuando les das algo concreto para resolver.

P: ¿Volverías a emprender si Ruta no funcionara?
R: Sí, sin dudarlo. Emprender es la forma que encontré de aprender más rápido que en cualquier otro lugar. Lo que no haría es volver a hacerlo solo.

P: ¿Qué perfiles necesita hoy Ruta?
R: Desarrollo frontend senior y alguien de operaciones que entienda de flotas. Trabajamos remoto con gente de toda la región.`
  },
  {
    slug: 'kiosko-whatsapp-stock-almacenes',
    section: 'startups',
    format: 'perfil',
    daysAgo: 11.3,
    views: 1040,
    title: 'Kiosko, la startup que convirtió WhatsApp en el sistema de stock de los almacenes',
    dek: 'Sin instalar nada y con mensajes de voz: así funciona la herramienta que nació en Rosario para que los comercios de barrio no se queden sin mercadería.',
    cover: U('1604719312566-8912e9227c6a'),
    person: { name: 'Florencia Díaz', role: 'Operations', company: 'Kiosko', photo: U('1508214751196-bcfd4ca60f91') },
    project: 'Kiosko',
    tags: ['E-commerce', 'Argentina', 'Pymes'],
    body: `En los almacenes de barrio, el sistema de stock suele ser un cuaderno, la memoria del dueño o ninguno. **Kiosko** propone algo más simple que cualquier software: mandar un mensaje de WhatsApp.

El comerciante escribe o graba un audio —"entraron dos cajas de yerba, se terminó el aceite"— y Kiosko actualiza el inventario, avisa cuando algo está por agotarse y arma el pedido para el proveedor.

## Diseñar para quien no tiene tiempo

Florencia Díaz, a cargo de operaciones, recorrió más de sesenta almacenes de Rosario antes de definir la primera versión. "Nadie quería otra app. Querían no quedarse sin pan a las once de la mañana", cuenta.

> Nuestro competidor no es otro software: es el cuaderno de la caja.
> — Florencia Díaz

La decisión de no tener una aplicación propia fue la más discutida dentro del equipo y la que mejor resultado dio: los comerciantes empiezan a usar Kiosko el mismo día que lo conocen, sin descargar nada ni crear contraseñas.

## Qué sigue

Kiosko ya tiene usuarios que lo usan a diario y ahora busca sumar perfiles de growth y operaciones para llegar a otras ciudades. El próximo paso es conectar a los almacenes entre sí para comprar en conjunto y conseguir mejores precios.`
  },
  {
    slug: 'equity-sueldo-o-las-dos',
    section: 'inversion',
    format: 'analisis',
    daysAgo: 13.8,
    views: 1260,
    title: 'Equity, sueldo o las dos: cómo se arma una propuesta para sumar a alguien a tu proyecto',
    dek: 'Una guía práctica para founders que necesitan sumar talento antes de tener capital: qué ofrecer, cómo hablarlo y qué dejar por escrito.',
    cover: U('1551434678-e076c223a692'),
    tags: ['Equity', 'Equipos', 'Guía'],
    body: `Es la pregunta que aparece en casi todas las primeras conversaciones entre founders y talento: ¿qué ofrecés? No hay una respuesta única, pero sí algunas reglas que evitan malentendidos que después cuestan caro.

## Primero, la dedicación

Antes de hablar de porcentajes, conviene hablar de horas. No es lo mismo alguien que suma diez horas por semana que alguien que deja su trabajo. En KeFounder! cada perfil muestra su disponibilidad justamente para que esa conversación empiece clara.

## Las tres propuestas más comunes

- **Solo equity:** habitual en etapa de idea o validación, cuando no hay ingresos. Funciona si la persona realmente es parte de la mesa fundadora.
- **Pago + equity:** cuando ya hay algo de facturación o inversión. Un sueldo menor al de mercado compensado con participación.
- **Solo pago:** para tareas puntuales o perfiles que prefieren no asumir riesgo. Es una relación de trabajo, no de sociedad.

> Repartir equity sin hablar de expectativas es posponer una discusión que siempre llega.

## Lo que conviene dejar por escrito

Aunque sea en un documento simple: qué porcentaje, en cuánto tiempo se gana (lo habitual es un período de cuatro años con un primer año de prueba), qué pasa si alguien se va y qué responsabilidades asume cada persona.

## Señales de alerta

Desconfiá de las propuestas que prometen mucho porcentaje sin hablar de tiempos, y de las que piden dedicación completa sin ninguna compensación. Una buena propuesta es la que ambas partes pueden explicar en voz alta sin incomodarse.`
  },
  {
    slug: 'founders-que-construyen-a-distancia',
    section: 'ecosistema',
    format: 'noticia',
    daysAgo: 15.1,
    views: 740,
    title: 'Montevideo, Asunción y Córdoba: el mapa de los founders que construyen a distancia',
    dek: 'Cada vez más equipos fundadores se arman entre ciudades distintas. Qué cambia, qué se complica y cómo lo resuelven.',
    cover: U('1523240795612-9a054b0db644'),
    tags: ['Ecosistema', 'Remoto', 'Región'],
    body: `La foto clásica de una startup —tres personas en un garaje— está cambiando. En la comunidad de KeFounder!, muchos de los proyectos más activos tienen equipos repartidos entre Montevideo, Asunción, Córdoba, Lima o Ciudad de México.

## Qué ganan los equipos distribuidos

La razón principal es el talento: un founder en Salto puede sumar a una diseñadora de Bogotá o a un desarrollador de Florianópolis. También aparecen ventajas menos obvias, como entender varios mercados desde el primer día.

> Elegir socios por afinidad y no por código postal cambió todo.

## Qué se complica

Los equipos consultados coinciden en tres desafíos: coordinar husos horarios, construir confianza sin compartir oficina y mantener la cultura cuando el equipo crece. Las soluciones que más se repiten son simples: una reunión semanal fija, decisiones por escrito y, cuando se puede, un encuentro presencial por trimestre.

## Herramientas para encontrarse

Plataformas como KeFounder! permiten filtrar por modalidad de trabajo —remoto, híbrido o presencial— y por disponibilidad, para que cada conversación arranque con las expectativas claras. Para muchos founders, ese filtro es el primer paso para armar un equipo que antes era imposible.`
  },
  {
    slug: 'marea-recolectores-costa-socio-tecnico',
    section: 'ecosistema',
    format: 'noticia',
    daysAgo: 18.4,
    views: 610,
    title: 'Marea suma recolectores en la costa uruguaya y busca socio técnico',
    dek: 'El proyecto de Emiliano Ruiz conecta a quienes recuperan plástico con marcas que quieren compensar su huella, y ya tiene acuerdos en Punta del Este.',
    cover: U('1505142468610-359e7d316be0'),
    person: { name: 'Emiliano Ruiz', role: 'Founder', company: 'Marea', photo: U('1560250097-0b93528c311a') },
    project: 'Marea',
    tags: ['Climate', 'Uruguay', 'Impacto'],
    body: `**Marea**, el proyecto de impacto ambiental fundado por Emiliano Ruiz en Punta del Este, sumó a su red a los primeros recolectores de plástico de la costa y cerró acuerdos con marcas locales que quieren compensar su huella.

El modelo es directo: los recolectores registran cuánto plástico entregan y las marcas pagan por ese material recuperado, con trazabilidad de punta a punta.

> Los recolectores ya hacen el trabajo más difícil. Nos falta la tecnología para que se les pague bien.
> — Emiliano Ruiz

El proyecto está en etapa de validación y su fundador busca un socio técnico y una persona de diseño para crear una app muy simple de registro de entregas, pensada para usarse al aire libre, con una mano y sin buena conexión.

Marea tiene su proyecto publicado en KeFounder!, donde detalla los perfiles que busca y el tipo de propuesta que ofrece.`
  }
];
