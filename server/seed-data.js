// Datos de demostración. Todas las personas y proyectos son ficticios.
const img = (id) => `https://images.unsplash.com/${id}`;

export const DEMO_PASSWORD = 'kefounder1234';

export const DEMO_ACCOUNTS = [
  {
    key: 'sol', email: 'sol@kefounder.demo', name: 'Sol Ortega', headline: 'Founder · Product builder', photo: img('photo-1531123897727-8f129e1688ce'),
    city: 'Montevideo', country: 'Uruguay', age: 31, plan: 'free', goal: 'find_talent', roles: ['founder', 'product'],
    skills: ['Product strategy', 'Fundraising', 'Finanzas', 'Figma'], interests: ['Fintech', 'IA', 'SaaS B2B'], languages: ['Español', 'Inglés'],
    availability: 'fulltime', compensation: 'equity', lookingFor: 'CTO y product designer para ContaAI', workMode: 'remote', experienceYears: 8,
    bio: 'Me gustan los problemas reales, los equipos curiosos y las ideas que mejoran un poquito el día de alguien. Estoy construyendo ContaAI.',
    experience: [{ title: 'Founder', org: 'ContaAI', period: '2025 — hoy' }, { title: 'Product manager', org: 'Pagosur', period: '2020 — 2025' }],
    linkedin: 'https://www.linkedin.com/in/sol-ortega-demo', accent: '#D4E0DA'
  },
  {
    key: 'ana', email: 'ana@kefounder.demo', name: 'Ana Rivas', headline: 'UX/UI designer', photo: img('photo-1544725176-7c40e5a71c5e'),
    city: 'Buenos Aires', country: 'Argentina', age: 28, plan: 'plus', goal: 'join_project', roles: ['designer'],
    skills: ['Figma', 'Product design', 'UX research', 'Branding', 'Copywriting'], interests: ['EdTech', 'HealthTech', 'Impacto social'], languages: ['Español', 'Inglés', 'Portugués'],
    availability: 'h20_40', compensation: 'mixed', lookingFor: 'Sumarme como diseñadora a un proyecto con impacto', workMode: 'remote', experienceYears: 5,
    bio: 'Diseño experiencias simples para problemas complejos. Vengo de una agencia y quiero sumarme a un equipo chico desde el día uno.',
    experience: [{ title: 'Senior UX/UI designer', org: 'Estudio Lumbre', period: '2022 — hoy' }, { title: 'UI designer', org: 'Mercado Libre', period: '2020 — 2022' }],
    portfolio: 'https://ana-rivas-demo.design', linkedin: 'https://www.linkedin.com/in/ana-rivas-demo', accent: '#F0E1D8'
  },
  {
    key: 'martin', email: 'martin@kefounder.demo', name: 'Martín López', headline: 'Full stack developer', photo: img('photo-1506794778202-cad84cf45f1d'),
    city: 'Montevideo', country: 'Uruguay', age: 29, plan: 'pro', goal: 'join_project', roles: ['developer'],
    skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'AWS'], interests: ['SaaS B2B', 'IA', 'Fintech'], languages: ['Español', 'Inglés'],
    availability: 'h10_20', compensation: 'mixed', lookingFor: 'Startup SaaS o IA', workMode: 'remote', experienceYears: 7,
    bio: 'Construyo productos web de punta a punta. Me interesa sumarme como socio técnico a un proyecto con usuarios reales.',
    experience: [{ title: 'Senior full stack developer', org: 'Nubo', period: '2022 — hoy' }, { title: 'Developer', org: 'Estudio Faro', period: '2018 — 2022' }],
    github: 'https://github.com/martin-lopez-demo', linkedin: 'https://www.linkedin.com/in/martin-lopez-demo', accent: '#E8D5CC'
  },
  {
    key: 'rodrigo', email: 'rodrigo@kefounder.demo', name: 'Rodrigo Barrios', headline: 'Founder & CEO en Brote', photo: img('photo-1557862921-37829c790f19'),
    city: 'Asunción', country: 'Paraguay', age: 36, plan: 'startup', goal: 'find_talent', roles: ['founder', 'ceo'],
    skills: ['Fundraising', 'Go-to-market', 'Ventas B2B', 'Operaciones'], interests: ['AgroTech', 'Climate', 'IA'], languages: ['Español', 'Inglés', 'Portugués'],
    availability: 'fulltime', compensation: 'mixed', lookingFor: 'Equipo técnico y de datos para escalar Brote', workMode: 'hybrid', experienceYears: 12,
    bio: 'Agrónomo e ingeniero. Brote ayuda a productores a regar solo lo necesario con sensores y modelos de datos. Facturamos en tres países y estamos armando el equipo para crecer.',
    experience: [{ title: 'Founder & CEO', org: 'Brote', period: '2022 — hoy' }, { title: 'Gerente de operaciones', org: 'AgroSur', period: '2015 — 2022' }],
    linkedin: 'https://www.linkedin.com/in/rodrigo-barrios-demo', accent: '#D4E0DA', verified: true
  }
];

export const PEOPLE = [
  { key: 'valentina', name: 'Valentina Ramos', headline: 'Product designer', photo: img('photo-1534528741775-53994a69daeb'), city: 'Montevideo', country: 'Uruguay', age: 27, goal: 'find_cofounder', roles: ['designer', 'product'], skills: ['Product design', 'Figma', 'UX research', 'Branding'], interests: ['Fintech', 'SaaS B2B'], languages: ['Español', 'Inglés'], availability: 'h10_20', compensation: 'mixed', lookingFor: 'Cofounder técnico para una fintech', workMode: 'remote', experienceYears: 6, bio: 'Diseño productos digitales con intención. Me entusiasma convertir problemas cotidianos en herramientas simples.', experience: [{ title: 'Senior product designer', org: 'Bancora', period: '2021 — hoy' }, { title: 'UX designer', org: 'Estudio Norte', period: '2018 — 2021' }], linkedin: 'https://www.linkedin.com/in/valentina-demo', portfolio: 'https://valentina-demo.design', plan: 'plus', online: true, verified: true, accent: '#C9D8D6' },
  { key: 'mateo', name: 'Mateo Silva', headline: 'Full stack developer', photo: img('photo-1500648767791-00dcc994a43e'), city: 'Buenos Aires', country: 'Argentina', age: 30, goal: 'join_project', roles: ['developer'], skills: ['React', 'Node.js', 'TypeScript', 'Machine learning', 'PostgreSQL'], interests: ['IA', 'Fintech', 'SaaS B2B'], languages: ['Español', 'Inglés'], availability: 'h20_40', compensation: 'equity', lookingFor: 'Startup early stage de IA', workMode: 'remote', experienceYears: 8, bio: 'Construyo productos de punta a punta. En mi tiempo libre, café bueno y proyectos que recién empiezan.', experience: [{ title: 'Tech lead', org: 'Pagoya', period: '2021 — 2025' }], github: 'https://github.com/mateo-demo', online: false, accent: '#F0E1D8' },
  { key: 'lucia', name: 'Lucía Fernández', headline: 'Growth marketer', photo: img('photo-1517841905240-472988babdf9'), city: 'Montevideo', country: 'Uruguay', age: 28, goal: 'join_project', roles: ['growth', 'marketing'], skills: ['Growth', 'Content', 'Go-to-market', 'SEO'], interests: ['EdTech', 'Impacto social', 'Fintech'], languages: ['Español', 'Inglés', 'Portugués'], availability: 'lt10', compensation: 'mixed', lookingFor: 'Startup con propósito en etapa MVP', workMode: 'remote', experienceYears: 5, bio: 'Ayudo a productos buenos a encontrar a su gente. Fan de experimentar, aprender y compartir el camino.', experience: [{ title: 'Growth lead', org: 'Aula 24', period: '2022 — hoy' }], linkedin: 'https://www.linkedin.com/in/lucia-demo', online: true, accent: '#E3EAE4' },
  { key: 'sofia', name: 'Sofía Méndez', headline: 'Founder & CEO en Pulso', photo: img('photo-1494790108377-be9c29b29330'), city: 'Santiago', country: 'Chile', age: 33, goal: 'find_cofounder', roles: ['founder', 'ceo'], skills: ['Fundraising', 'Ventas B2B', 'Product strategy'], interests: ['HealthTech', 'IA'], languages: ['Español', 'Inglés'], availability: 'fulltime', compensation: 'equity', lookingFor: 'CTO para HealthTech con IA', workMode: 'hybrid', experienceYears: 10, bio: 'Ingeniera industrial. Pasé ocho años en salud digital y ahora construyo Pulso para que nadie espere tres meses para saber cómo está.', experience: [{ title: 'Founder & CEO', org: 'Pulso', period: '2025 — hoy' }, { title: 'Head of operations', org: 'Clínica Alameda', period: '2017 — 2025' }], linkedin: 'https://www.linkedin.com/in/sofia-demo', plan: 'startup', online: true, verified: true, accent: '#DFE3DA' },
  { key: 'joaquin', name: 'Joaquín Pereira', headline: 'Backend developer', photo: img('photo-1507003211169-0a1dd7228f2d'), city: 'Montevideo', country: 'Uruguay', age: 26, goal: 'join_project', roles: ['developer'], skills: ['Python', 'Go', 'PostgreSQL', 'AWS', 'DevOps'], interests: ['Fintech', 'Logística'], languages: ['Español', 'Inglés'], availability: 'h10_20', compensation: 'equity', lookingFor: 'Proyecto con tracción y buen equipo', workMode: 'remote', experienceYears: 5, bio: 'Me gustan los sistemas que escalan sin drama. Busco un equipo chico con ganas de hacer las cosas bien.', experience: [{ title: 'Backend engineer', org: 'Dlocal', period: '2021 — hoy' }], github: 'https://github.com/joaquin-demo', online: true, accent: '#D4E0DA' },
  { key: 'camila', name: 'Camila Torres', headline: 'UX/UI designer', photo: img('photo-1438761681033-6461ffad8d80'), city: 'Bogotá', country: 'Colombia', age: 25, goal: 'join_project', roles: ['designer'], skills: ['Figma', 'UX research', 'Product design'], interests: ['EdTech', 'E-commerce'], languages: ['Español'], availability: 'h10_20', compensation: 'mixed', lookingFor: 'Proyecto paralelo de impacto', workMode: 'remote', experienceYears: 3, bio: 'Diseño pensando en las personas que no tienen tiempo para leer manuales. Busco un proyecto donde el diseño importe desde el día uno.', experience: [{ title: 'UX designer', org: 'Rappi', period: '2023 — hoy' }], portfolio: 'https://camila-demo.design', online: false, accent: '#E8D5CC' },
  { key: 'diego', name: 'Diego Castro', headline: 'Founder serial · Ruta', photo: img('photo-1472099645785-5658abf4ff4e'), city: 'Ciudad de México', country: 'México', age: 52, goal: 'find_talent', roles: ['founder', 'ceo', 'sales'], skills: ['Ventas B2B', 'Partnerships', 'Go-to-market', 'Fundraising'], interests: ['Logística', 'SaaS B2B'], languages: ['Español', 'Inglés'], availability: 'fulltime', compensation: 'mixed', lookingFor: 'Frontend y product designer para Ruta', workMode: 'hybrid', experienceYears: 25, bio: 'Tercera startup. Vendí la anterior en 2021. Hoy Ruta factura y necesitamos sumar talento para crecer en la región.', experience: [{ title: 'Founder & CEO', org: 'Ruta', period: '2023 — hoy' }, { title: 'Founder', org: 'Envíalo (adquirida)', period: '2015 — 2021' }], linkedin: 'https://www.linkedin.com/in/diego-demo', plan: 'startup', online: false, verified: true, accent: '#C9D8D6' },
  { key: 'martina', name: 'Martina Suárez', headline: 'Product manager', photo: img('photo-1544005313-94ddf0286df2'), city: 'Buenos Aires', country: 'Argentina', age: 31, goal: 'find_cofounder', roles: ['product'], skills: ['Product strategy', 'Roadmapping', 'UX research', 'Data science'], interests: ['LegalTech', 'IA', 'Fintech'], languages: ['Español', 'Inglés'], availability: 'h20_40', compensation: 'equity', lookingFor: 'Cofounder técnico para un SaaS', workMode: 'remote', experienceYears: 7, bio: 'Siete años haciendo producto en scale-ups. Ahora quiero construir lo mío: Lumen, contratos claros para freelancers.', experience: [{ title: 'Senior PM', org: 'Ualá', period: '2020 — hoy' }], linkedin: 'https://www.linkedin.com/in/martina-demo', plan: 'pro', online: true, accent: '#F0E1D8' },
  { key: 'tomas', name: 'Tomás Rivera', headline: 'Mobile developer', photo: img('photo-1535713875002-d1d0cf377fde'), city: 'Asunción', country: 'Paraguay', age: 29, goal: 'join_project', roles: ['developer'], skills: ['Flutter', 'React Native', 'iOS', 'Android'], interests: ['AgroTech', 'Fintech'], languages: ['Español', 'Inglés'], availability: 'lt10', compensation: 'equity', lookingFor: 'Proyecto mobile-first', workMode: 'remote', experienceYears: 6, bio: 'Apps que funcionan bien aunque la señal no ayude. Me interesan los proyectos que llegan al interior.', experience: [{ title: 'Mobile lead', org: 'Tigo Money', period: '2021 — hoy' }], github: 'https://github.com/tomas-demo', online: false, accent: '#E3EAE4' },
  { key: 'isabella', name: 'Isabella Rossi', headline: 'Marketing lead', photo: img('photo-1580489944761-15a19d654956'), city: 'São Paulo', country: 'Brasil', age: 30, goal: 'join_project', roles: ['marketing', 'growth'], skills: ['Branding', 'Performance marketing', 'Content', 'Community'], interests: ['E-commerce', 'Food'], languages: ['Portugués', 'Español', 'Inglés'], availability: 'h10_20', compensation: 'paid', lookingFor: 'Marca de consumo con producto listo', workMode: 'remote', experienceYears: 8, bio: 'Construí la marca de dos e-commerce desde cero hasta el primer millón. Me encanta el food y el retail.', experience: [{ title: 'Head of marketing', org: 'Feira Viva', period: '2022 — hoy' }], linkedin: 'https://www.linkedin.com/in/isabella-demo', online: true, accent: '#DFE3DA' },
  { key: 'nicolas', name: 'Nicolás Acosta', headline: 'Founder · Alquila', photo: img('photo-1599566150163-29194dcaad36'), city: 'Montevideo', country: 'Uruguay', age: 32, goal: 'create_project', roles: ['founder', 'product'], skills: ['Product strategy', 'No-code', 'Finanzas'], interests: ['PropTech', 'Fintech'], languages: ['Español'], availability: 'h10_20', compensation: 'equity', lookingFor: 'Full stack developer para validar Alquila', workMode: 'hybrid', experienceYears: 9, bio: 'Economista. Me cansé de ver a amigos sin poder alquilar por no tener garantía. Estoy validando Alquila.', experience: [{ title: 'Analista financiero', org: 'BROU', period: '2016 — hoy' }], online: false, accent: '#D4E0DA' },
  { key: 'julieta', name: 'Julieta Romero', headline: 'Founder · Mesa', photo: img('photo-1573496359142-b8d87734a5a2'), city: 'Buenos Aires', country: 'Argentina', age: 29, goal: 'find_cofounder', roles: ['founder', 'marketing'], skills: ['Branding', 'Go-to-market', 'Community'], interests: ['Food', 'E-commerce', 'Marketplace'], languages: ['Español', 'Inglés'], availability: 'h20_40', compensation: 'equity', lookingFor: 'CTO que ame la comida casera', workMode: 'hybrid', experienceYears: 6, bio: 'Hija de cocinera. Mesa nació en mi barrio de Palermo y ya tiene 60 cocineros activos.', experience: [{ title: 'Founder', org: 'Mesa', period: '2024 — hoy' }], linkedin: 'https://www.linkedin.com/in/julieta-demo', online: true, accent: '#E8D5CC' },
  { key: 'emiliano', name: 'Emiliano Ruiz', headline: 'Founder · Marea', photo: img('photo-1560250097-0b93528c311a'), city: 'Punta del Este', country: 'Uruguay', age: 38, goal: 'find_talent', roles: ['founder', 'ceo'], skills: ['Fundraising', 'Finanzas', 'Partnerships'], interests: ['Climate', 'Turismo', 'Impacto social'], languages: ['Español', 'Inglés'], availability: 'fulltime', compensation: 'mixed', lookingFor: 'Cofounder y product manager para Marea', workMode: 'hybrid', experienceYears: 14, bio: 'Surfista y ex banquero. Quiero que el plástico que llega a la costa valga más recuperado que tirado.', experience: [{ title: 'VP', org: 'Banco Atlántico', period: '2012 — 2024' }], linkedin: 'https://www.linkedin.com/in/emiliano-demo', plan: 'pro', online: false, verified: true, accent: '#C9D8D6' },
  { key: 'paula', name: 'Paula Giménez', headline: 'Sales & partnerships', photo: img('photo-1573497019940-1c28c88b4f3e'), city: 'Córdoba', country: 'Argentina', age: 41, goal: 'create_project', roles: ['sales', 'founder'], skills: ['Ventas B2B', 'Partnerships', 'Go-to-market'], interests: ['HR Tech', 'SaaS B2B'], languages: ['Español', 'Inglés'], availability: 'h20_40', compensation: 'mixed', lookingFor: 'Equipo técnico para Tándem', workMode: 'remote', experienceYears: 16, bio: 'Vendí software B2B durante 15 años. Tándem es la herramienta que me hubiera gustado tener cuando empecé.', experience: [{ title: 'Sales director', org: 'Globant', period: '2014 — 2024' }], linkedin: 'https://www.linkedin.com/in/paula-demo', online: true, accent: '#F0E1D8' },
  { key: 'santiago', name: 'Santiago Núñez', headline: 'Founder & CTO · Nido', photo: img('photo-1519085360753-af0119f7cbe7'), city: 'Montevideo', country: 'Uruguay', age: 31, goal: 'find_talent', roles: ['founder', 'developer'], skills: ['TypeScript', 'React', 'AWS', 'Product strategy'], interests: ['EdTech', 'IA'], languages: ['Español', 'Inglés'], availability: 'fulltime', compensation: 'mixed', lookingFor: 'Product designer y growth para Nido', workMode: 'remote', experienceYears: 10, bio: 'Aprendí a programar en un grupo de estudio de cinco personas. Nido es mi forma de devolver eso.', experience: [{ title: 'Founder & CTO', org: 'Nido', period: '2024 — hoy' }, { title: 'Staff engineer', org: 'Mercado Libre', period: '2017 — 2024' }], github: 'https://github.com/santiago-demo', online: true, accent: '#E3EAE4' },
  { key: 'renata', name: 'Renata Vega', headline: 'Brand designer', photo: img('photo-1548142813-c348350df52b'), city: 'Quito', country: 'Ecuador', age: 27, goal: 'explore', roles: ['designer'], skills: ['Branding', 'Figma', 'Copywriting'], interests: ['Media', 'Turismo'], languages: ['Español', 'Inglés'], availability: 'lt10', compensation: 'personal', lookingFor: 'Proyectos con identidad fuerte', workMode: 'remote', experienceYears: 4, bio: 'Diseño identidades para marcas que tienen algo para decir. Explorando proyectos para sumar en paralelo.', experience: [{ title: 'Diseñadora independiente', org: 'Freelance', period: '2021 — hoy' }], portfolio: 'https://renata-demo.design', online: false, accent: '#DFE3DA' },
  { key: 'federico', name: 'Federico Blanco', headline: 'Growth & product · Orbita', photo: img('photo-1522075469751-3a6694fb2f61'), city: 'Madrid', country: 'España', age: 33, goal: 'find_cofounder', roles: ['growth', 'product', 'founder'], skills: ['Growth', 'SEO', 'Performance marketing', 'Data science'], interests: ['SaaS B2B', 'E-commerce'], languages: ['Español', 'Inglés'], availability: 'h20_40', compensation: 'equity', lookingFor: 'Frontend y sales para Orbita', workMode: 'remote', experienceYears: 11, bio: 'Uruguayo en Madrid. Hice growth en tres scale-ups y ahora construyo Orbita con un equipo chico y remoto.', experience: [{ title: 'Head of growth', org: 'Typeform', period: '2019 — 2024' }], linkedin: 'https://www.linkedin.com/in/federico-demo', plan: 'pro', online: true, accent: '#D4E0DA' },
  { key: 'agustina', name: 'Agustina Paz', headline: 'Frontend developer', photo: img('photo-1524504388940-b1c1722653e1'), city: 'La Plata', country: 'Argentina', age: 24, goal: 'join_project', roles: ['developer', 'designer'], skills: ['React', 'TypeScript', 'Figma'], interests: ['Impacto social', 'EdTech'], languages: ['Español', 'Inglés'], availability: 'h10_20', compensation: 'mixed', lookingFor: 'Experiencia real en una startup', workMode: 'remote', experienceYears: 2, bio: 'Frontend con ojo de diseño. Quiero aprender construyendo algo real con un equipo que sepa más que yo.', experience: [{ title: 'Frontend developer', org: 'Agencia Pampa', period: '2024 — hoy' }], github: 'https://github.com/agustina-demo', online: false, accent: '#E8D5CC' },
  { key: 'lautaro', name: 'Lautaro Gómez', headline: 'Frontend developer', photo: img('photo-1539571696357-5a69c17a67c6'), city: 'Montevideo', country: 'Uruguay', age: 23, goal: 'join_project', roles: ['developer'], skills: ['React', 'TypeScript', 'Node.js'], interests: ['Gaming', 'Media', 'SaaS B2B'], languages: ['Español', 'Inglés'], availability: 'h20_40', compensation: 'paid', lookingFor: 'Primer proyecto serio como dev', workMode: 'hybrid', experienceYears: 1, bio: 'Estudiante de ingeniería en el último año. Hice tres proyectos personales y quiero sumarme a un equipo.', experience: [{ title: 'Pasante', org: 'Sofka', period: '2025 — hoy' }], github: 'https://github.com/lautaro-demo', online: true, accent: '#C9D8D6' },
  { key: 'carolina', name: 'Carolina Herrera', headline: 'AI engineer', photo: img('photo-1487412720507-e7ab37603c6f'), city: 'Medellín', country: 'Colombia', age: 29, goal: 'join_project', roles: ['developer'], skills: ['Python', 'Machine learning', 'AWS', 'Data science'], interests: ['IA', 'LegalTech', 'Fintech'], languages: ['Español', 'Inglés'], availability: 'h10_20', compensation: 'equity', lookingFor: 'Proyecto de IA aplicada', workMode: 'remote', experienceYears: 6, bio: 'Llevo modelos de IA a producción. Me interesan los problemas donde la IA ahorra horas de trabajo aburrido.', experience: [{ title: 'ML engineer', org: 'Bancolombia', period: '2021 — hoy' }], github: 'https://github.com/carolina-demo', plan: 'plus', online: true, verified: true, accent: '#F0E1D8' },
  { key: 'gonzalo', name: 'Gonzalo Ferreira', headline: 'Founder · Campo Claro', photo: img('photo-1552058544-f2b08422138a'), city: 'Salto', country: 'Uruguay', age: 40, goal: 'create_project', roles: ['founder', 'operations'], skills: ['Operaciones', 'Ventas B2B'], interests: ['AgroTech'], languages: ['Español'], availability: 'h20_40', compensation: 'mixed', lookingFor: 'Mobile developer para Campo Claro', workMode: 'onsite', experienceYears: 18, bio: 'Productor ganadero de tercera generación. Conozco el problema desde adentro y quiero resolverlo con tecnología simple.', experience: [{ title: 'Director', org: 'Estancia La Aurora', period: '2008 — hoy' }], online: false, accent: '#E3EAE4' },
  { key: 'florencia', name: 'Florencia Díaz', headline: 'Operations · Kiosko', photo: img('photo-1508214751196-bcfd4ca60f91'), city: 'Rosario', country: 'Argentina', age: 46, goal: 'find_talent', roles: ['operations', 'founder'], skills: ['Operaciones', 'Finanzas', 'Legal'], interests: ['E-commerce', 'Logística', 'Food'], languages: ['Español'], availability: 'h20_40', compensation: 'mixed', lookingFor: 'Backend y growth para Kiosko', workMode: 'hybrid', experienceYears: 20, bio: 'Veinte años en operaciones de retail. Kiosko ayuda a los almacenes de barrio a no quedarse sin stock.', experience: [{ title: 'Gerenta de operaciones', org: 'La Anónima', period: '2005 — 2024' }], linkedin: 'https://www.linkedin.com/in/florencia-demo', online: true, accent: '#DFE3DA' },
  { key: 'andres', name: 'Andrés Morales', headline: 'Data scientist', photo: img('photo-1463453091185-61582044d556'), city: 'Lima', country: 'Perú', age: 28, goal: 'join_project', roles: ['developer'], skills: ['Python', 'Machine learning', 'Data science'], interests: ['IA', 'HealthTech', 'Fintech'], languages: ['Español', 'Inglés'], availability: 'h10_20', compensation: 'mixed', lookingFor: 'Datos con impacto real', workMode: 'remote', experienceYears: 5, bio: 'Convierto datos desordenados en decisiones. Me motivan los proyectos de salud y finanzas personales.', experience: [{ title: 'Data scientist', org: 'Interbank', period: '2021 — hoy' }], github: 'https://github.com/andres-demo', online: false, accent: '#D4E0DA' },
  { key: 'micaela', name: 'Micaela Sosa', headline: 'Community & content', photo: img('photo-1529626455594-4ff0802cfb7e'), city: 'Montevideo', country: 'Uruguay', age: 26, goal: 'join_project', roles: ['marketing'], skills: ['Community', 'Content', 'Copywriting'], interests: ['EdTech', 'Media', 'Impacto social'], languages: ['Español', 'Inglés'], availability: 'lt10', compensation: 'personal', lookingFor: 'Comunidades que crecen de verdad', workMode: 'remote', experienceYears: 4, bio: 'Armé una comunidad de 20.000 personas que aprenden a programar. Me encanta que la gente se encuentre.', experience: [{ title: 'Community manager', org: 'Codeando', period: '2022 — hoy' }], online: true, accent: '#E8D5CC' },
  { key: 'pedro', name: 'Pedro Alves', headline: 'DevOps engineer', photo: img('photo-1570295999919-56ceb5ecca61'), city: 'Florianópolis', country: 'Brasil', age: 34, goal: 'join_project', roles: ['developer', 'operations'], skills: ['DevOps', 'AWS', 'Go'], interests: ['SaaS B2B', 'Fintech'], languages: ['Portugués', 'Español', 'Inglés'], availability: 'lt10', compensation: 'paid', lookingFor: 'Infraestructura para crecer sin sustos', workMode: 'remote', experienceYears: 11, bio: 'Hago que la infraestructura sea aburrida, en el buen sentido. Puedo sumar unas horas por semana.', experience: [{ title: 'SRE', org: 'Nubank', period: '2019 — hoy' }], github: 'https://github.com/pedro-demo', online: false, accent: '#C9D8D6' },
  { key: 'lara', name: 'Lara Benítez', headline: 'UX researcher', photo: img('photo-1554151228-14d9def656e4'), city: 'Mendoza', country: 'Argentina', age: 26, goal: 'join_project', roles: ['designer', 'product'], skills: ['UX research', 'Product design', 'Figma'], interests: ['HealthTech', 'EdTech'], languages: ['Español', 'Inglés'], availability: 'h10_20', compensation: 'equity', lookingFor: 'Validar ideas con usuarios reales', workMode: 'remote', experienceYears: 3, bio: 'Hago las preguntas incómodas antes de que se escriba una línea de código. Me encanta la etapa de validación.', experience: [{ title: 'UX researcher', org: 'Despegar', period: '2023 — hoy' }], portfolio: 'https://lara-demo.design', online: true, accent: '#F0E1D8' },
  { key: 'bruno', name: 'Bruno Costa', headline: 'Product designer', photo: img('photo-1501196354995-cbb51c65aaea'), city: 'Porto Alegre', country: 'Brasil', age: 30, goal: 'join_project', roles: ['designer'], skills: ['Product design', 'Figma', 'UX research', 'Branding'], interests: ['Fintech', 'HealthTech'], languages: ['Portugués', 'Español', 'Inglés'], availability: 'h20_40', compensation: 'paid', lookingFor: 'Fintech con producto en la calle', workMode: 'remote', experienceYears: 7, bio: 'Diseñé apps que usan millones de personas en Brasil. Busco un equipo chico donde tener más impacto.', experience: [{ title: 'Senior product designer', org: 'PicPay', period: '2020 — hoy' }], portfolio: 'https://bruno-demo.design', online: false, accent: '#E3EAE4' }
];

export const PROJECTS = [
  {
    owner: 'sol', name: 'ContaAI', tagline: 'Automatización contable con IA para pequeñas empresas.', cover: img('photo-1454165804606-c3d57bc86b40'),
    description: 'ContaAI lee facturas, concilia cuentas bancarias y prepara los reportes impositivos de una pyme en minutos. Arrancamos en Uruguay con 14 estudios contables usando la beta y queremos llegar a toda la región.',
    problem: 'Las pymes pierden entre 10 y 15 horas por mes cargando facturas, conciliando cuentas y persiguiendo comprobantes. Los estudios contables no dan abasto y los errores cuestan caro.',
    solution: 'Un asistente que se conecta al banco y al correo, reconoce comprobantes con IA y deja todo listo para que el contador solo revise y apruebe.',
    stage: 'mvp', industry: 'Fintech', city: 'Montevideo', country: 'Uruguay', workMode: 'remote', dedication: 'h20_40', compensation: 'equity',
    rolesNeeded: [{ role: 'cto', dedication: 'h20_40', compensation: 'equity', equity: '15–25%', note: 'Liderar la arquitectura y el equipo técnico.' }, { role: 'designer', dedication: 'h10_20', compensation: 'mixed', equity: '2–5%', note: 'Diseñar la experiencia de la app web.' }],
    stack: ['React', 'Node.js', 'Python', 'PostgreSQL', 'AWS'], team: [{ name: 'Ignacio Varela', role: 'Finanzas y operaciones' }], hasUsers: true, accent: '#DFE3DA', status: 'published', daysAgo: 21
  },
  {
    owner: 'sol', name: 'Tienda Circular', tagline: 'Ropa de segunda mano curada para oficinas.', cover: img('photo-1532996122724-e3c354a0b15b'),
    description: '', problem: 'La ropa de oficina se usa poco y se descarta rápido.', solution: '', stage: 'idea', industry: 'E-commerce', city: 'Montevideo', country: 'Uruguay', workMode: 'hybrid',
    dedication: 'lt10', compensation: 'talk', rolesNeeded: [{ role: 'marketing', dedication: 'lt10', compensation: 'equity', equity: '', note: '' }], stack: [], team: [], accent: '#D4E0DA', status: 'draft', daysAgo: 4
  },
  {
    owner: 'sofia', name: 'Pulso', tagline: 'Monitoreo remoto de pacientes crónicos con IA.', cover: img('photo-1576091160399-112ba8d25d1d'),
    description: 'Pulso acompaña a pacientes con diabetes e hipertensión entre consulta y consulta. Estamos probando el prototipo con dos clínicas en Santiago.',
    problem: 'Los pacientes crónicos ven a su médico cada tres meses; en el medio nadie sabe cómo están y las complicaciones llegan tarde.',
    solution: 'Una app que recoge datos de dispositivos y síntomas, detecta alertas tempranas con IA y avisa al equipo médico.',
    stage: 'prototype', industry: 'HealthTech', city: 'Santiago', country: 'Chile', workMode: 'hybrid', dedication: 'fulltime', compensation: 'equity',
    rolesNeeded: [{ role: 'cto', dedication: 'fulltime', compensation: 'equity', equity: '10–20%', note: 'Construir la plataforma y el equipo técnico.' }, { role: 'data', dedication: 'h20_40', compensation: 'mixed', equity: '1–3%', note: 'Modelos de alertas tempranas.' }],
    stack: ['Python', 'React Native', 'AWS', 'Machine learning'], team: [{ name: 'Dra. Inés Carrasco', role: 'Directora médica' }], accent: '#E8D5CC', status: 'published', daysAgo: 12
  },
  {
    owner: 'diego', name: 'Ruta', tagline: 'Rutas de última milla optimizadas para pymes de reparto.', cover: img('photo-1553413077-190dd305871c'),
    description: 'Más de 120 pymes de reparto en México usan Ruta para planificar entregas. Facturamos desde 2025 y estamos listos para crecer en Colombia y Chile.',
    problem: 'Las pymes planifican repartos en planillas y WhatsApp: pierden tiempo, combustible y clientes.',
    solution: 'Un planificador que ordena las paradas, avisa a los clientes y mide cada entrega en tiempo real.',
    stage: 'revenue', industry: 'Logística', city: 'Ciudad de México', country: 'México', workMode: 'hybrid', dedication: 'fulltime', compensation: 'mixed',
    rolesNeeded: [{ role: 'frontend', dedication: 'fulltime', compensation: 'mixed', equity: '0,5–1%', note: 'Dashboard de planificación.' }, { role: 'designer', dedication: 'h20_40', compensation: 'paid', equity: '', note: 'Experiencia del repartidor.' }],
    stack: ['React', 'TypeScript', 'Go', 'PostgreSQL'], team: [{ name: 'Ana Lucero', role: 'CTO' }, { name: 'Rafael Ortiz', role: 'Operaciones' }, { name: 'Mónica Díaz', role: 'Customer success' }], hasUsers: true, hasRevenue: true, accent: '#C9D8D6', status: 'published', daysAgo: 30
  },
  {
    owner: 'nicolas', name: 'Alquila', tagline: 'Alquileres sin garantía para jóvenes profesionales.', cover: img('photo-1560518883-ce09059eeffa'),
    description: 'Estamos validando con 40 inquilinos y 6 inmobiliarias en Montevideo.',
    problem: 'Conseguir una garantía para alquilar es caro y lento: miles de jóvenes con ingresos estables quedan afuera.',
    solution: 'Evaluamos el perfil financiero con datos abiertos y respaldamos el contrato frente al propietario.',
    stage: 'validation', industry: 'PropTech', city: 'Montevideo', country: 'Uruguay', workMode: 'hybrid', dedication: 'h10_20', compensation: 'equity',
    rolesNeeded: [{ role: 'fullstack', dedication: 'h10_20', compensation: 'equity', equity: '5–10%', note: 'Primer MVP.' }, { role: 'growth', dedication: 'lt10', compensation: 'equity', equity: '1–3%', note: '' }],
    stack: ['React', 'Node.js', 'No-code'], team: [], accent: '#F0E1D8', status: 'published', daysAgo: 9
  },
  {
    owner: 'santiago', name: 'Nido', tagline: 'Una plataforma de aprendizaje entre personas.', cover: img('photo-1523240795612-9a054b0db644'),
    description: 'Nido conecta a personas que quieren aprender algo con quienes ya lo saben, en grupos chicos y con encuentros semanales. 900 personas ya completaron un grupo.',
    problem: 'Los cursos online tienen tasas de finalización menores al 10%: aprender solo cuesta.',
    solution: 'Grupos de cinco personas, una guía y un objetivo concreto. La comunidad sostiene la motivación.',
    stage: 'mvp', industry: 'EdTech', city: 'Montevideo', country: 'Uruguay', workMode: 'remote', dedication: 'h10_20', compensation: 'mixed',
    rolesNeeded: [{ role: 'designer', dedication: 'h10_20', compensation: 'mixed', equity: '1–3%', note: 'Rediseñar la experiencia de grupos.' }, { role: 'growth', dedication: 'h10_20', compensation: 'equity', equity: '1–2%', note: '' }],
    stack: ['React', 'Node.js', 'PostgreSQL'], team: [{ name: 'Clara Méndez', role: 'Comunidad' }, { name: 'Tobías Ríos', role: 'Backend' }], hasUsers: true, accent: '#E3EAE4', status: 'published', daysAgo: 18
  },
  {
    owner: 'emiliano', name: 'Marea', tagline: 'Conectamos a quienes recuperan plástico con marcas que quieren hacer mejor.', cover: img('photo-1505142468610-359e7d316be0'),
    description: 'Trabajamos con tres cooperativas de recuperadores en Maldonado y dos marcas de bebidas interesadas en certificar su impacto.',
    problem: 'Recuperadores y cooperativas venden plástico a precios bajísimos y sin trazabilidad; las marcas no pueden certificar su impacto.',
    solution: 'Un marketplace con trazabilidad que paga mejor al recuperador y certifica el impacto para la marca.',
    stage: 'validation', industry: 'Climate', city: 'Punta del Este', country: 'Uruguay', workMode: 'hybrid', dedication: 'fulltime', compensation: 'equity',
    rolesNeeded: [{ role: 'cofounder', dedication: 'fulltime', compensation: 'equity', equity: '20–30%', note: 'Socio/a para construir el producto.' }, { role: 'product', dedication: 'h20_40', compensation: 'equity', equity: '3–6%', note: '' }],
    stack: [], team: [], accent: '#DFE3DA', status: 'published', daysAgo: 6
  },
  {
    owner: 'gonzalo', name: 'Campo Claro', tagline: 'Trazabilidad simple para productores ganaderos.', cover: img('photo-1500382017468-9049fed747ef'),
    description: 'Prototipo funcionando en cuatro establecimientos del litoral uruguayo.',
    problem: 'Los productores medianos registran todo en papel y pierden acceso a mercados que exigen trazabilidad.',
    solution: 'Una app que funciona sin señal, registra cada animal con el celular y genera los reportes que piden los frigoríficos.',
    stage: 'prototype', industry: 'AgroTech', city: 'Salto', country: 'Uruguay', workMode: 'onsite', dedication: 'h20_40', compensation: 'mixed',
    rolesNeeded: [{ role: 'mobile', dedication: 'h20_40', compensation: 'mixed', equity: '2–5%', note: 'App offline-first.' }, { role: 'sales', dedication: 'h10_20', compensation: 'mixed', equity: '', note: '' }],
    stack: ['Flutter', 'PostgreSQL'], team: [], accent: '#D4E0DA', status: 'published', daysAgo: 15
  },
  {
    owner: 'julieta', name: 'Mesa', tagline: 'Marketplace de cocineros caseros en tu barrio.', cover: img('photo-1555396273-367ea4eb4db5'),
    description: '60 cocineros activos y 1.200 pedidos en Palermo y Villa Crespo en los últimos tres meses.',
    problem: 'Hay miles de personas que cocinan increíble y no tienen cómo vender de forma segura y legal.',
    solution: 'Una plataforma que valida, asegura y conecta a cocineros caseros con vecinos que quieren comer rico.',
    stage: 'mvp', industry: 'Food', city: 'Buenos Aires', country: 'Argentina', workMode: 'hybrid', dedication: 'fulltime', compensation: 'equity',
    rolesNeeded: [{ role: 'cto', dedication: 'fulltime', compensation: 'equity', equity: '10–15%', note: '' }, { role: 'marketing', dedication: 'h10_20', compensation: 'mixed', equity: '', note: '' }],
    stack: ['React Native', 'Node.js'], team: [{ name: 'Pilar Ocampo', role: 'Operaciones' }], hasUsers: true, accent: '#E8D5CC', status: 'published', daysAgo: 24
  },
  {
    owner: 'martina', name: 'Lumen', tagline: 'Contratos claros para freelancers, redactados con IA.', cover: img('photo-1589829545856-d10d557cf95f'),
    description: 'Una idea que nació de mis propios contratos. Estoy entrevistando a 30 freelancers para validar.',
    problem: 'Los freelancers firman contratos que no entienden o trabajan sin contrato.',
    solution: 'Plantillas inteligentes que se adaptan a cada proyecto y explican cada cláusula en lenguaje simple.',
    stage: 'idea', industry: 'LegalTech', city: 'Buenos Aires', country: 'Argentina', workMode: 'remote', dedication: 'h10_20', compensation: 'equity',
    rolesNeeded: [{ role: 'backend', dedication: 'h10_20', compensation: 'equity', equity: '10–20%', note: '' }, { role: 'designer', dedication: 'lt10', compensation: 'equity', equity: '2–4%', note: '' }],
    stack: ['Python', 'TypeScript', 'Machine learning'], team: [], accent: '#C9D8D6', status: 'published', daysAgo: 3
  },
  {
    owner: 'federico', name: 'Orbita', tagline: 'Analytics de producto sin código para equipos pequeños.', cover: img('photo-1551288049-bebda4e38f71'),
    description: '310 equipos usan Orbita y 42 ya pagan. Cerramos una ronda pre-seed en 2026.',
    problem: 'Las herramientas de analytics son caras y complejas: los equipos chicos terminan decidiendo a ciegas.',
    solution: 'Un snippet, un tablero y las preguntas clave respondidas en lenguaje natural.',
    stage: 'investment', industry: 'SaaS B2B', city: 'Madrid', country: 'España', workMode: 'remote', dedication: 'h20_40', compensation: 'mixed',
    rolesNeeded: [{ role: 'frontend', dedication: 'h20_40', compensation: 'mixed', equity: '0,5–1,5%', note: '' }, { role: 'sales', dedication: 'h20_40', compensation: 'mixed', equity: '', note: 'Mercado LATAM.' }],
    stack: ['React', 'TypeScript', 'Go', 'AWS'], team: [{ name: 'Marta Gil', role: 'Engineering' }], hasUsers: true, hasRevenue: true, hasInvestment: true, accent: '#F0E1D8', status: 'published', daysAgo: 40
  },
  {
    owner: 'paula', name: 'Tándem', tagline: 'Mentorías 1:1 entre profesionales senior y juniors.', cover: img('photo-1522071820081-009f0129c71c'),
    description: 'Tres empresas de software de Córdoba quieren pilotear Tándem con sus equipos.',
    problem: 'Muchos juniors dejan su primer trabajo en tech antes del año por falta de acompañamiento.',
    solution: 'Programas de mentoría que las empresas contratan para retener talento joven.',
    stage: 'validation', industry: 'HR Tech', city: 'Córdoba', country: 'Argentina', workMode: 'remote', dedication: 'h10_20', compensation: 'equity',
    rolesNeeded: [{ role: 'fullstack', dedication: 'h10_20', compensation: 'equity', equity: '8–12%', note: '' }, { role: 'designer', dedication: 'lt10', compensation: 'equity', equity: '1–3%', note: '' }, { role: 'growth', dedication: 'lt10', compensation: 'equity', equity: '1–3%', note: '' }],
    stack: ['React', 'Node.js'], team: [], accent: '#E3EAE4', status: 'published', daysAgo: 11
  },
  {
    owner: 'florencia', name: 'Kiosko', tagline: 'Gestión de stock por WhatsApp para almacenes de barrio.', cover: img('photo-1604719312566-8912e9227c6a'),
    description: '85 almacenes en Rosario usan Kiosko todos los días.',
    problem: 'Los almacenes no usan software de gestión: es caro, difícil y no entra en su día a día.',
    solution: 'Un asistente por WhatsApp que registra ventas y compras con mensajes de voz y avisa cuando falta stock.',
    stage: 'users', industry: 'E-commerce', city: 'Rosario', country: 'Argentina', workMode: 'hybrid', dedication: 'h20_40', compensation: 'mixed',
    rolesNeeded: [{ role: 'backend', dedication: 'h20_40', compensation: 'mixed', equity: '2–4%', note: '' }, { role: 'growth', dedication: 'h10_20', compensation: 'mixed', equity: '', note: '' }],
    stack: ['Node.js', 'Python', 'PostgreSQL'], team: [{ name: 'Hernán Paz', role: 'Producto' }], hasUsers: true, accent: '#DFE3DA', status: 'published', daysAgo: 20
  },
  {
    owner: 'martin', name: 'Formo', tagline: 'Formularios que se completan solos para trámites de pymes.', cover: img('photo-1551434678-e076c223a692'),
    description: 'Proyecto paralelo que arranqué hace dos meses. Hay un prototipo funcionando con tres estudios contables que lo prueban cada semana.',
    problem: 'Las pymes repiten los mismos datos en decenas de formularios de bancos, proveedores y organismos públicos.',
    solution: 'Una extensión que reconoce el formulario y lo completa con los datos de la empresa, con revisión antes de enviar.',
    stage: 'prototype', industry: 'SaaS B2B', city: 'Montevideo', country: 'Uruguay', workMode: 'remote', dedication: 'lt10', compensation: 'equity',
    rolesNeeded: [{ role: 'designer', dedication: 'lt10', compensation: 'equity', equity: '5–10%', note: 'Diseñar la experiencia de la extensión.' }, { role: 'growth', dedication: 'lt10', compensation: 'equity', equity: '3–5%', note: 'Conseguir los primeros 50 clientes.' }],
    stack: ['React', 'TypeScript', 'Node.js'], team: [], hasUsers: true, accent: '#E8D5CC', status: 'published', daysAgo: 12
  },
  {
    owner: 'rodrigo', name: 'Brote', tagline: 'Riego inteligente: sensores y datos para regar solo lo necesario.', cover: img('photo-1625246333195-78d9c38ad449'),
    description: 'Brote combina sensores de humedad de bajo costo con modelos de clima para decirle a cada productor cuándo y cuánto regar. Hoy lo usan 140 establecimientos en Paraguay, Uruguay y Argentina.',
    problem: 'Los productores riegan a ojo: desperdician hasta un 40% del agua y la energía, y aun así pierden cosecha en las olas de calor.',
    solution: 'Sensores que se instalan en minutos, una app que avisa por WhatsApp y un modelo que aprende de cada lote.',
    stage: 'revenue', industry: 'AgroTech', city: 'Asunción', country: 'Paraguay', workMode: 'hybrid', dedication: 'fulltime', compensation: 'mixed',
    rolesNeeded: [{ role: 'mobile', dedication: 'fulltime', compensation: 'mixed', equity: '0,5–1%', note: 'App para productores en campo, con modo sin conexión.' }, { role: 'backend', dedication: 'fulltime', compensation: 'paid', equity: '', note: 'Ingesta de datos de miles de sensores.' }, { role: 'sales', dedication: 'h20_40', compensation: 'mixed', equity: '0,5%', note: 'Abrir el mercado de Brasil.' }],
    stack: ['React Native', 'Python', 'PostgreSQL', 'AWS', 'Machine learning'],
    team: [{ name: 'Lucía Benítez', role: 'CTO' }, { name: 'Marcos Ibarra', role: 'Head of sales' }, { name: 'Carla Duarte', role: 'Diseño de producto' }, { name: 'Tomás Aquino', role: 'Ingeniero agrónomo' }],
    hasUsers: true, hasRevenue: true, hasInvestment: true, accent: '#D4E0DA', status: 'published', daysAgo: 30
  },
  {
    owner: 'rodrigo', name: 'Brote Datos', tagline: 'Buscamos equipo de datos para predecir riego y cosecha.', cover: img('photo-1592982537447-7440770cbfc9'),
    description: 'Una búsqueda dentro de Brote: vamos a armar el equipo de datos que convierta tres años de mediciones en predicciones de cosecha.',
    problem: 'Tenemos millones de lecturas de sensores y clima, pero hoy solo las usamos para alertas simples.',
    solution: 'Modelos de predicción por cultivo y zona, que después se ofrecen a cooperativas y aseguradoras.',
    stage: 'revenue', industry: 'IA', city: 'Asunción', country: 'Paraguay', workMode: 'remote', dedication: 'h20_40', compensation: 'paid',
    rolesNeeded: [{ role: 'data', dedication: 'fulltime', compensation: 'paid', equity: '', note: 'Liderar el equipo de datos.' }, { role: 'backend', dedication: 'h20_40', compensation: 'paid', equity: '', note: 'Pipelines de datos.' }],
    stack: ['Python', 'Machine learning', 'Data science', 'AWS'], team: [{ name: 'Lucía Benítez', role: 'CTO' }], hasUsers: true, hasRevenue: true, hasInvestment: true, accent: '#DFE3DA', status: 'published', daysAgo: 8
  },
  {
    owner: 'rodrigo', name: 'Brote Academia', tagline: 'Cursos cortos de riego eficiente para productores.', cover: '',
    description: 'Idea en borrador: capacitaciones por WhatsApp y en cooperativas.', problem: 'Muchos productores no saben interpretar los datos de sus lotes.', solution: '',
    stage: 'idea', industry: 'EdTech', city: 'Asunción', country: 'Paraguay', workMode: 'hybrid', dedication: 'lt10', compensation: 'talk',
    rolesNeeded: [{ role: 'marketing', dedication: 'lt10', compensation: 'talk', equity: '', note: '' }], stack: [], team: [], accent: '#F0E1D8', status: 'draft', daysAgo: 3
  }
];
