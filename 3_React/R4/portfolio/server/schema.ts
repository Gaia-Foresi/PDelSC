// ============================================================
//  ESTRUCTURA DE LA BASE DE DATOS
// ------------------------------------------------------------
//  Cada parte del portfolio tiene su propia tabla:
//
//   admin_usuarios  → quién puede entrar al panel
//   perfil          → textos sueltos (nombre, "sobre mí", stats, contacto)
//   habilidades     → una fila por habilidad
//   experiencias    → una fila por experiencia
//   proyectos       → una fila por proyecto
//   contactos       → mensajes que llegan desde el formulario
//
//  Las listas (descripción, tecnologías, características) se
//  guardan como texto: una cosa por línea o separadas por coma.
// ============================================================

export const TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS admin_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS perfil (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS habilidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    nivel TINYINT NOT NULL DEFAULT 3,
    categoria VARCHAR(30) NOT NULL,
    orden INT NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS experiencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    lugar VARCHAR(150) NOT NULL DEFAULT '',
    fecha VARCHAR(50) NOT NULL DEFAULT '',
    descripcion TEXT NOT NULL,
    tecnologias VARCHAR(255) NOT NULL DEFAULT '',
    orden INT NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS proyectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    fecha VARCHAR(50) NOT NULL DEFAULT '',
    descripcion TEXT NOT NULL,
    tecnologias VARCHAR(255) NOT NULL DEFAULT '',
    caracteristicas TEXT NOT NULL,
    link VARCHAR(255) NOT NULL DEFAULT '',
    github VARCHAR(255) NOT NULL DEFAULT '',
    orden INT NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS contactos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

// ---------- Claves permitidas en la tabla "perfil" ----------
export const PERFIL_CLAVES = [
  'nombre',
  'rol',
  'intro',
  'about_p1',
  'about_p2',
  'about_p3',
  'stat_years',
  'stat_years_label',
  'stat_projects',
  'stat_projects_label',
  'stat_techs',
  'stat_techs_label',
  'email',
  'ubicacion',
  'github',
  'linkedin',
] as const;

export type PerfilClave = (typeof PERFIL_CLAVES)[number];

// ---------- Contenido inicial (lo que ya tenías en la página) ----------
export const SEED_PERFIL: Record<PerfilClave, string> = {
  nombre: 'Gaia Foresi',
  rol: 'Estudiante de 7° año en la Tecnicatura en Informática',
  intro: 'Hago páginas, juegos y aplicaciones web. Este es mi cuaderno de proyectos.',
  about_p1:
    'Hola, soy Gaia Foresi, estudiante de 7° año de la Escuela de Educación Secundaria Técnica N°5, con especialización en la tecnicatura de Informática.',
  about_p2:
    'Actualmente estoy aprendiendo **C++, Java, TypeScript, JavaScript, Node.js, React, HTML y CSS**, además de bases de datos **SQL**.',
  about_p3:
    'Mi objetivo es poder crear páginas y aplicaciones web tanto útiles como divertidas para diversos sectores.',
  stat_years: '3',
  stat_years_label: 'Años programando',
  stat_projects: '5',
  stat_projects_label: 'Proyectos completados',
  stat_techs: '',
  stat_techs_label: 'Tecnologías',
  email: 'gaiaforesi17@email.com',
  ubicacion: 'Mar del Plata, Argentina',
  github: 'https://github.com/Gaia-Foresi',
  linkedin: '',
};

export const SEED_HABILIDADES: Array<[string, number, string]> = [
  ['C++', 2, 'programacion'],
  ['Java', 2, 'programacion'],
  ['HTML5 / CSS3', 4, 'frontend'],
  ['JavaScript', 3, 'frontend'],
  ['TypeScript', 3, 'frontend'],
  ['React', 3, 'frontend'],
  ['MySQL', 4, 'backend'],
  ['Node.js', 3, 'backend'],
  ['PHP', 3, 'backend'],
  ['VS Code', 4, 'tools'],
  ['GitHub', 3, 'tools'],
  ['Trabajo en equipo', 5, 'soft'],
  ['Comunicación', 4, 'soft'],
  ['Resolución de problemas', 4, 'soft'],
  ['Aprendizaje autónomo', 3, 'soft'],
];

export const SEED_EXPERIENCIAS = [
  {
    titulo: 'Portfolio personal',
    lugar: 'Proyecto personal de 7° año',
    fecha: '2026 - presente',
    descripcion: [
      'Creación de un portfolio personal para mostrar mis proyectos y habilidades',
      'Diseño responsivo, tema claro/oscuro y panel de administración',
      'Backend con Node.js, Express y base de datos TiDB (MySQL)',
    ].join('\n'),
    tecnologias: 'TypeScript, CSS, Node.js, MySQL',
  },
  {
    titulo: 'Videojuego de Pac-Man',
    lugar: 'Proyecto grupal de 7° año',
    fecha: '2026 - presente',
    descripcion: [
      'Réplica de Pac-Man con un estilo visual diferente',
      'Mecánicas de juego, puntuaciones y sprites hechos a mano',
      'Trabajo en equipo de 2 personas',
    ].join('\n'),
    tecnologias: 'HTML, CSS, JavaScript',
  },
  {
    titulo: 'Desarrollo de e-commerce',
    lugar: 'Proyecto escolar de 5° año',
    fecha: '2024',
    descripcion: [
      'Comercio electrónico para una exposición escolar de temática libre',
      'Carrusel, menú de navegación y tarjetas de productos',
      'Uno de mis primeros proyectos en grupo',
    ].join('\n'),
    tecnologias: 'HTML, CSS',
  },
];

export const SEED_PROYECTOS = [
  {
    nombre: 'Videojuego de Snake rediseñado',
    fecha: '2026',
    descripcion: 'Réplica del clásico Snake con un diseño nuevo.',
    tecnologias: 'HTML, CSS, JavaScript',
    caracteristicas: [
      'Diseño moderno y responsivo',
      'Sprites hechos a mano y sonido de juego',
      'Registro de jugadores y puntuaciones',
    ].join('\n'),
  },
  {
    nombre: 'Diario digital con Bootstrap',
    fecha: '2026',
    descripcion: 'Diario digital informativo con diseño responsivo.',
    tecnologias: 'HTML, CSS, Bootstrap, JavaScript',
    caracteristicas: [
      'Diseño responsivo con Bootstrap',
      'Sección de noticias y artículos',
      'Formulario de contacto con validación',
    ].join('\n'),
  },
  {
    nombre: 'Página informativa de Arduino',
    fecha: '2024',
    descripcion: 'Página web sobre Arduino, con secciones de piezas y proyectos.',
    tecnologias: 'HTML, CSS',
    caracteristicas: [
      'Sección de piezas de Arduino',
      'Sección de proyectos con ejemplos',
      'Imágenes y descripciones de cada proyecto',
    ].join('\n'),
  },
];
