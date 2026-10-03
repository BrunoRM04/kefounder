// Pedidos de ayuda de ejemplo para la demo: unos de la semana pasada (ya cerrada, con podio)
// y otros de la semana en curso, para que el ranking y los reconocimientos se vean desde el primer día.
// `at` es la fracción de la semana (0 = lunes 00:00, 1 = domingo 23:59) en la que pasó cada cosa;
// en la semana en curso se reparte entre el lunes y este momento.

export const SAMPLE_HELP = [
  {
    week: 'last', at: 0.05, user: 'sofia', category: 'producto',
    title: 'validar la idea antes de escribir una línea de código',
    body: 'Estoy por arrancar Pulso, una app para que pacientes crónicos registren síntomas y el médico los vea antes de la consulta. Tengo ganas de programar ya, pero me da miedo construir algo que nadie use. ¿Cómo validaron ustedes una idea con poco presupuesto? ¿Qué señales les alcanzaron para seguir?',
    acceptedAt: 0.62,
    answers: [
      {
        user: 'federico', at: 0.09, accepted: true, votes: [['martina', 0.15], ['diego', 0.2], ['valentina', 0.33]],
        body: 'Antes de programar armá una landing con la promesa concreta («tu médico ve cómo estuviste, sin planillas») y un formulario de lista de espera. Pautá 50 dólares en Instagram apuntando a pacientes con diabetes o hipertensión y medí cuántos dejan el email: si de 100 visitas se anotan menos de 5, el mensaje no está funcionando.\n\nEn paralelo hacé 10 entrevistas. Preguntá qué hacen hoy para llevar el registro, no si usarían tu app.'
      },
      {
        user: 'martina', at: 0.14, votes: [['sofia', 0.21], ['federico', 0.3]],
        body: 'Sumo a lo de Federico: hacé un «MVP concierge». Los primeros cinco pacientes te mandan los síntomas por WhatsApp y vos le armás el resumen al médico a mano. Si el médico lo usa en la consulta, tenés una señal real. Si ni lo mira, aprendiste algo muy barato.'
      },
      {
        user: 'diego', at: 0.24, votes: [['emiliano', 0.4]],
        body: 'Elegí una sola métrica para decidir: que el médico pida el resumen la segunda vez sin que se lo recuerdes. Eso vale más que cien encuestas.'
      }
    ]
  },
  {
    week: 'last', at: 0.12, user: 'emiliano', category: 'inversion',
    title: 'armar el pitch para un fondo pre-seed',
    body: 'En Marea recuperamos plástico de la costa y lo vendemos a fábricas. Tenemos tres clientes y ventas chicas. Me reuní con un fondo y me dijeron que el pitch «no cuenta por qué ahora». ¿Cómo estructuran un deck de pre-seed? ¿Qué no puede faltar?',
    acceptedAt: 0.55,
    answers: [
      {
        user: 'diego', at: 0.18, accepted: true, votes: [['emiliano', 0.3], ['sofia', 0.35], ['martin', 0.48]],
        body: 'Diez diapositivas, en este orden: problema, por qué ahora, solución, tracción, mercado, modelo de negocio, competencia, equipo, cuánto levantás y para qué.\n\nEn tu caso el «por qué ahora» es regulatorio: si hay leyes de envases o metas de reciclado que entran en vigencia, ponelas con fecha. Y abrí con tus tres clientes: la tracción es tu mejor argumento.'
      },
      {
        user: 'sofia', at: 0.26, votes: [['emiliano', 0.31]],
        body: 'Practicá el pitch de dos minutos antes que el deck: si no lo podés contar sin diapositivas, el deck no te va a salvar. A mí me sirvió grabarme y mandárselo a tres founders amigos para que me dijeran qué no entendían.'
      }
    ]
  },
  {
    week: 'last', at: 0.2, user: 'rodrigo', category: 'tecnologia',
    title: 'elegir el stack para el MVP de Brote con poco presupuesto',
    body: 'Brote conecta productores rurales con compradores. Somos dos y ninguno es técnico. Nos cotizaron una app nativa en 25 mil dólares y no los tenemos. ¿Qué stack recomiendan para salir rápido sin tener que tirar todo después?',
    acceptedAt: 0.7,
    answers: [
      {
        user: 'martin', at: 0.23, accepted: true, votes: [['rodrigo', 0.36], ['carolina', 0.4], ['lautaro', 0.52], ['joaquin', 0.6]],
        body: 'Para dos founders no técnicos, una web app instalable (PWA) en vez de una app nativa: React en el frente, Supabase para la base de datos y el login, y Vercel para publicar. Funciona en el celular, se instala como una app y cuesta casi nada mientras sean pocos usuarios.\n\nCuando validen, el mismo código escala o se migra por partes.'
      },
      {
        user: 'carolina', at: 0.29, votes: [['rodrigo', 0.37]],
        body: 'Si en el campo hay mala señal, pensá en offline desde el día uno: que la app guarde los pedidos en el teléfono y los sincronice cuando vuelve la conexión. Es mucho más fácil diseñarlo al principio que agregarlo después.'
      },
      {
        user: 'joaquin', at: 0.34,
        body: 'Antes de contratar a nadie, probá con no-code (Glide o Softr sobre una planilla) para las primeras 20 ventas. Vas a descubrir qué pantallas importan de verdad.'
      }
    ]
  },
  {
    week: 'last', at: 0.3, user: 'martina', category: 'ventas',
    title: 'conseguir los primeros 10 clientes B2B para Lumen',
    body: 'Lumen arma contratos claros para freelancers y estudios chicos. El producto anda, pero todavía nadie paga. ¿Cómo consiguieron sus primeros clientes B2B? ¿Outbound, comunidades, alianzas?',
    acceptedAt: 0.78,
    answers: [
      {
        user: 'federico', at: 0.34, accepted: true, votes: [['martina', 0.45], ['paula', 0.5], ['diego', 0.58]],
        body: 'Los primeros diez salen a mano. Armá una lista de 50 estudios contables y de diseño y escribile al dueño por LinkedIn: mensaje corto y una oferta concreta (primer mes gratis a cambio de 20 minutos de feedback). Con 50 mensajes bien escritos deberías tener 8 o 10 conversaciones.\n\nNo automatices nada hasta saber qué mensaje funciona.'
      },
      {
        user: 'paula', at: 0.39, votes: [['martina', 0.47]],
        body: 'Buscá alianzas con quien ya les vende a tus clientes: los contadores les recomiendan herramientas a los freelancers todo el tiempo. Ofreceles una comisión por cada cliente que traigan.'
      },
      {
        user: 'diego', at: 0.43, votes: [['federico', 0.6]],
        body: 'Cobrá desde el primer cliente, aunque sea poco. Uno que paga 10 dólares te dice mucho más que diez que lo usan gratis.'
      }
    ]
  },
  {
    week: 'current', at: 0.08, user: 'valentina', category: 'equipo',
    title: 'repartir el equity con mi cofounder',
    body: 'Me voy a asociar con un cofounder técnico para una fintech. Yo arranqué la idea hace un año, pero él va a construir todo el producto. ¿Cómo repartieron ustedes? ¿50/50? ¿Vesting?',
    acceptedAt: 0.62,
    answers: [
      {
        user: 'emiliano', at: 0.2, accepted: true, votes: [['valentina', 0.5], ['sofia', 0.55], ['martina', 0.7]],
        body: 'Lo que pasó antes pesa menos que lo que viene: si los dos van a estar a tiempo completo, 50/50 o algo muy cercano es sano.\n\nLo innegociable es el vesting: cuatro años con un año de cliff para los dos. Así, si alguien se va a los seis meses, no se queda con la mitad de la empresa.'
      },
      {
        user: 'sofia', at: 0.3, votes: [['valentina', 0.52]],
        body: 'Antes de los números, hablen de los escenarios incómodos: qué pasa si uno quiere vender y el otro no, o si uno deja de dedicarle tiempo. Ponerlo por escrito en un pacto de socios les ahorra muchas peleas.'
      }
    ]
  },
  {
    week: 'current', at: 0.18, user: 'sol', category: 'producto',
    title: 'ponerle precio a un SaaS para pymes',
    body: 'Estoy armando una herramienta para que las pymes manejen turnos y cobros. No sé si cobrar por usuario, por local o un precio fijo. ¿Cómo definieron el precio de sus productos? ¿Qué errores cometieron?',
    answers: [
      {
        user: 'federico', at: 0.3, votes: [['sol', 0.4], ['ana', 0.5]],
        body: 'Cobrá por lo que crece junto con el valor para el cliente. En turnos y cobros suele ser la cantidad de locales o de profesionales, no de usuarios. Armá tres planes (básico, crecimiento y multilocal) y hacé que el del medio sea el obvio.'
      },
      {
        user: 'ana', at: 0.36, votes: [['sol', 0.45], ['valentina', 0.6], ['federico', 0.75]],
        body: 'Desde diseño: mostrá el precio en la web, aunque sea «desde». Las pymes no completan formularios de «pedí una cotización». Y probá un plan anual con dos meses gratis: mejora la caja.'
      },
      {
        user: 'lucia', at: 0.5,
        body: 'Hacele a 15 clientes potenciales las cuatro preguntas de Van Westendorp: a qué precio les parece barato, caro, demasiado caro y tan barato que desconfían. En una tarde tenés un rango razonable.'
      }
    ]
  },
  {
    week: 'current', at: 0.3, user: 'diego', category: 'equipo',
    title: 'contratar al primer desarrollador sin ser técnico',
    body: 'En Ruta ya facturamos y necesito sumar al primer desarrollador del equipo. No soy técnico y no sé cómo evaluar si alguien es bueno. ¿Qué preguntas hacen? ¿Conviene una prueba técnica paga?',
    answers: [
      {
        user: 'carolina', at: 0.42, votes: [['diego', 0.5], ['martin', 0.6], ['mateo', 0.8]],
        body: 'Pedile a un desarrollador de confianza que te acompañe en la entrevista técnica, aunque le pagues unas horas. Y sí: una prueba paga de 4 a 8 horas, parecida a un problema real de Ruta, dice más que cualquier entrevista. Fijate cómo explica lo que hizo, no solo el resultado.'
      },
      {
        user: 'mateo', at: 0.56, votes: [['diego', 0.62]],
        body: 'Preguntale qué haría en su primera semana y qué no tocaría. Alguien con experiencia te va a hablar de entender el sistema antes de reescribirlo.'
      }
    ]
  },
  {
    week: 'current', at: 0.45, user: 'federico', category: 'diseno',
    title: 'mejorar el onboarding de Orbita: la mitad abandona en el paso 2',
    body: 'En Orbita, la mitad de las personas que se registran abandona en el paso 2 del onboarding, cuando les pedimos conectar la cuenta de Google Ads. ¿Cómo lo resolverían?',
    answers: [
      {
        user: 'valentina', at: 0.55, votes: [['federico', 0.62], ['ana', 0.7], ['camila', 0.85]],
        body: 'Mové la conexión para después del primer valor: dejá que vean un tablero de ejemplo con datos ficticios de su industria y recién cuando entienden qué van a obtener, pediles conectar. Y explicá en una línea qué permisos pedís y para qué.'
      },
      {
        user: 'ana', at: 0.6, votes: [['federico', 0.66]],
        body: 'Sumá la opción «lo hago después» y mandá un recordatorio por email a las 24 horas con una captura de lo que van a ver. Muchas veces quien se registra no tiene acceso a la cuenta de Ads y necesita pedírselo a alguien.'
      },
      {
        user: 'camila', at: 0.7,
        body: 'Grabá cinco sesiones en ese paso con Hotjar o Clarity: vas a ver si es miedo a los permisos o si directamente no encuentran el botón.'
      }
    ]
  }
];
