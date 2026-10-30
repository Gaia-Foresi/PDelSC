// Carga categorías, libros de ejemplo, la distribuidora y usuarios de prueba (ver ../../credenciales.txt).
// Es seguro ejecutarlo más de una vez: no duplica lo que ya existe.
//   npm run db:seed              -> catálogo + usuarios + datos de demostración
//   npm run db:seed -- --solo-catalogo
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const { hoy, sumarDias } = require('../src/utils/fechas');
const { codigoRetiroUnico } = require('../src/utils/codigos');

// Categorías de libros: [código, nombre, descripción, icono, color]
const CATEGORIAS = [
  ['cn', 'Ciencias Naturales', 'Biología, ecología y ciencias de la Tierra', 'leaf', '#8FAE8B'],
  ['H', 'Historia', 'Hechos, épocas y personajes', 'bank', '#8D5524'],
  ['F', 'Ficción', 'Novelas y relatos de imaginación', 'feather', '#E0C097'],
  ['CF', 'Ciencia Ficción', 'Futuros posibles y mundos imaginados', 'rocket-launch', '#4A5D23'],
  ['R', 'Romance', 'Historias de amor', 'heart', '#C62828'],
  ['C', 'Cuentos', 'Relatos breves para todas las edades', 'book-open-variant', '#B85C38'],
  ['M', 'Misterio', 'Enigmas, detectives y crímenes', 'magnify', '#5D4037'],
  ['T', 'Terror', 'Historias para no dormir', 'ghost', '#37474F'],
];

// [categoría, título, autor, descripción, stock]
const LIBROS = [
  ['cn', 'El origen de las especies', 'Charles Darwin', 'La obra que explica la evolución por selección natural, con observaciones de viaje y argumentos que cambiaron la biología.', 3],
  ['cn', 'Primavera silenciosa', 'Rachel Carson', 'Una advertencia temprana sobre el impacto de los pesticidas en la naturaleza y el origen del movimiento ambiental moderno.', 2],
  ['cn', 'Breve historia de casi todo', 'Bill Bryson', 'Un recorrido ameno por el universo, la Tierra y la vida, contado con humor y curiosidad.', 2],
  ['H', 'Sapiens', 'Yuval Noah Harari', 'De los primeros humanos a la actualidad: cómo nuestra especie llegó a dominar el planeta.', 3],
  ['H', 'Las venas abiertas de América Latina', 'Eduardo Galeano', 'Ensayo sobre cinco siglos de historia económica y política de la región.', 2],
  ['H', 'Facundo', 'Domingo F. Sarmiento', 'Clásico argentino que mezcla biografía, ensayo y crónica para retratar una época.', 2],
  ['F', 'Rayuela', 'Julio Cortázar', 'Novela que se puede leer en más de un orden y que revolucionó la narrativa latinoamericana.', 2],
  ['F', 'Ficciones', 'Jorge Luis Borges', 'Relatos fantásticos sobre laberintos, bibliotecas infinitas y espejos.', 3],
  ['F', 'Cien años de soledad', 'Gabriel García Márquez', 'La saga de la familia Buendía en el pueblo imaginario de Macondo.', 3],
  ['CF', 'Fahrenheit 451', 'Ray Bradbury', 'Una sociedad donde los libros están prohibidos y los bomberos los queman.', 2],
  ['CF', 'Fundación', 'Isaac Asimov', 'Un matemático predice la caída de un imperio galáctico e intenta acortar los siglos de oscuridad que vienen.', 2],
  ['CF', 'El Eternauta', 'Héctor G. Oesterheld', 'Una nevada mortal cae sobre Buenos Aires y un grupo de sobrevivientes intenta resistir.', 2],
  ['R', 'Orgullo y prejuicio', 'Jane Austen', 'Elizabeth Bennet y el señor Darcy en una historia de malentendidos y de amor.', 3],
  ['R', 'Jane Eyre', 'Charlotte Brontë', 'Una joven huérfana busca su lugar en el mundo y se enamora en una casa llena de secretos.', 2],
  ['R', 'El amor en los tiempos del cólera', 'Gabriel García Márquez', 'Un amor que espera más de cincuenta años para realizarse.', 2],
  ['C', 'Cuentos de la selva', 'Horacio Quiroga', 'Relatos para chicos y grandes con animales y aventuras en la selva misionera.', 3],
  ['C', 'Final del juego', 'Julio Cortázar', 'Cuentos breves donde lo cotidiano esconde algo inquietante.', 2],
  ['C', 'El Aleph', 'Jorge Luis Borges', 'Relatos sobre el infinito, la memoria y el destino.', 2],
  ['M', 'Estudio en escarlata', 'Arthur Conan Doyle', 'La primera aventura de Sherlock Holmes y el doctor Watson.', 2],
  ['M', 'Asesinato en el Orient Express', 'Agatha Christie', 'Un crimen en un tren detenido por la nieve y doce sospechosos.', 2],
  ['M', 'El nombre de la rosa', 'Umberto Eco', 'Un monje investigador y una serie de muertes en una abadía medieval.', 2],
  ['T', 'Drácula', 'Bram Stoker', 'El conde transilvano llega a Inglaterra y un grupo de amigos intenta detenerlo.', 2],
  ['T', 'Frankenstein', 'Mary Shelley', 'Un joven científico da vida a una criatura y debe afrontar las consecuencias.', 2],
  ['T', 'Narraciones extraordinarias', 'Edgar Allan Poe', 'Cuentos de terror y misterio, entre ellos El gato negro y El corazón delator.', 2],
];

// Usuarios de demostración
const USUARIOS = [
  { nombre: 'Marta', apellido: 'Ceibo', email: 'dueno@ceibolibros.com', password: 'Dueno2026', rol: 1 },
  { nombre: 'Bruno', apellido: 'Bibliotecario', email: 'biblioteca@ceibolibros.com', password: 'Biblio2026', rol: 2 },
  { nombre: 'Lucía', apellido: 'Lectora', email: 'lucia@ejemplo.com', password: 'Lector2026', rol: 3, curso: '5° B', dni: '40123456' },
  { nombre: 'Tomás', apellido: 'Moroso', email: 'tomas@ejemplo.com', password: 'Lector2026', rol: 3, curso: '4° A', dni: '41222333' },
];

async function main() {
  const soloCatalogo = process.argv.includes('--solo-catalogo');

  // Insertar roles
  for (const [rolId, nombre] of [[1, 'dueno'], [2, 'bibliotecario'], [3, 'usuario']]) {
    await pool.query('INSERT IGNORE INTO roles (id, nombre) VALUES (?, ?)', [rolId, nombre]);
  }

  // Insertar categorías
  for (const [codigo, nombre, descripcion, icono, color] of CATEGORIAS) {
    await pool.query(
      'INSERT INTO categorias (codigo, nombre, descripcion, icono, color) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
      [codigo, nombre, descripcion, icono, color]);
  }

  // Insertar libros y autores
  const [cats] = await pool.query('SELECT id, codigo FROM categorias');
  const catId = Object.fromEntries(cats.map((c) => [c.codigo, c.id]));

  // Insertar libros y autores
  for (const [cat, titulo, autor, descripcion, stock] of LIBROS) {
    const [a] = await pool.query('INSERT INTO autores (nombre) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [autor]);
    const [ya] = await pool.query('SELECT id FROM libros WHERE titulo = ?', [titulo]);
    if (!ya.length) {
      await pool.query(
        'INSERT INTO libros (titulo, autor_id, categoria_id, descripcion, stock_total) VALUES (?, ?, ?, ?, ?)',
        [titulo, a.insertId, catId[cat], descripcion, stock]);
    }
  }

  // Insertar distribuidora de ejemplo si no hay ninguna
  const [dist] = await pool.query('SELECT id FROM distribuidoras LIMIT 1');
  if (!dist.length) {
    await pool.query('INSERT INTO distribuidoras (nombre, email, telefono) VALUES (?, ?, ?)',
      ['Distribuidora Ejemplo', 'distribuidoralibrosmdp@gmail.com', '+54 11 5555-0000']);
  }
  console.log(`✔ Catálogo: ${CATEGORIAS.length} categorías, ${LIBROS.length} libros`);
  if (soloCatalogo) return;

  // Insertar usuarios de prueba
  const ids = {};
  for (const u of USUARIOS) {
    const [ya] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [u.email]);
    if (ya.length) { ids[u.email] = ya[0].id; continue; }
    const [r] = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, curso, dni, email_verificado) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [u.nombre, u.apellido, u.email, await bcrypt.hash(u.password, 10), u.rol, u.curso || null, u.dni || null]);
    ids[u.email] = r.insertId;
  }
  console.log(`✔ Usuarios de prueba: ${USUARIOS.map((u) => u.email).join(', ')}`);

  // ---- Datos de demostración (solo si todavía no hay préstamos) ----
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM prestamos');
  if (n > 0) return;
  const staff = ids['biblioteca@ceibolibros.com'];
  const lucia = ids['lucia@ejemplo.com'];
  const tomas = ids['tomas@ejemplo.com'];
  const libro = async (titulo) => (await pool.query('SELECT id FROM libros WHERE titulo = ?', [titulo]))[0][0].id;
  const h = hoy();

  // Historial cerrado de los últimos meses (alimenta las estadísticas)
  const historial = [
    [150, 'Sapiens'], [140, 'Rayuela'], [118, 'Drácula'], [112, 'Sapiens'], [95, 'Ficciones'], [88, 'Fahrenheit 451'],
    [70, 'Orgullo y prejuicio'], [64, 'Sapiens'], [52, 'Cien años de soledad'], [41, 'Estudio en escarlata'],
    [33, 'Cuentos de la selva'], [27, 'Sapiens'], [20, 'Ficciones'], [16, 'El Eternauta'],
  ];

  // Insertar préstamos cerrados y devoluciones
  for (const [hace, titulo] of historial) {
    const inicio = sumarDias(h, -hace);
    const [p] = await pool.query(
      "INSERT INTO prestamos (usuario_id, registrado_por, fecha_inicio, fecha_vencimiento, estado, cerrado_en, visita_en, codigo_retiro) VALUES (?, ?, ?, ?, 'cerrado', ?, ?, ?)",
      [lucia, staff, inicio, sumarDias(inicio, 14), `${sumarDias(inicio, 10)} 12:00:00`, `${inicio} 13:00:00`, await codigoRetiroUnico(pool)]);
    await pool.query('INSERT INTO prestamo_items (prestamo_id, libro_id, devuelto_en) VALUES (?, ?, ?)', [p.insertId, await libro(titulo), `${sumarDias(inicio, 10)} 12:00:00`]);
  }

  // Lucía: un préstamo que vence en 2 días (dispara el recordatorio)
  const inicioL = sumarDias(h, -12);
  const [pl] = await pool.query('INSERT INTO prestamos (usuario_id, registrado_por, fecha_inicio, fecha_vencimiento, visita_en, codigo_retiro) VALUES (?, ?, ?, ?, ?, ?)', [lucia, staff, inicioL, sumarDias(h, 2), `${inicioL} 13:00:00`, await codigoRetiroUnico(pool)]);
  for (const t of ['Jane Eyre', 'Frankenstein']) await pool.query('INSERT INTO prestamo_items (prestamo_id, libro_id) VALUES (?, ?)', [pl.insertId, await libro(t)]);
  await pool.query("INSERT INTO reservas (usuario_id, libro_id, tipo, fecha_limite, visita_en, codigo_retiro) VALUES (?, ?, 'sala', DATE_ADD(NOW(), INTERVAL 20 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), ?)", [lucia, await libro('Sapiens'), await codigoRetiroUnico(pool)]);

  // Tomás: préstamo vencido y cuenta bloqueada con mensaje
  const motivo = 'Tenés libros sin devolver con el plazo vencido. Devolvelos en la biblioteca y tu cuenta se habilita automáticamente.';
  const [pt] = await pool.query('INSERT INTO prestamos (usuario_id, registrado_por, fecha_inicio, fecha_vencimiento, visita_en, codigo_retiro) VALUES (?, ?, ?, ?, ?, ?)', [tomas, staff, sumarDias(h, -20), sumarDias(h, -6), `${sumarDias(h, -20)} 13:00:00`, await codigoRetiroUnico(pool)]);
  await pool.query('INSERT INTO prestamo_items (prestamo_id, libro_id) VALUES (?, ?)', [pt.insertId, await libro('El nombre de la rosa')]);
  await pool.query("UPDATE usuarios SET estado = 'bloqueado', motivo_bloqueo = ?, bloqueado_en = NOW() WHERE id = ?", [motivo, tomas]);
  await pool.query("INSERT INTO notificaciones (usuario_id, tipo, titulo, cuerpo, prestamo_id) VALUES (?, 'bloqueo', 'Cuenta bloqueada', ?, NULL)", [tomas, motivo]);

  // Mensajes de ejemplo: una consulta respondida y un hilo interno dueño -> bibliotecario
  const dueno = ids['dueno@ceibolibros.com'];
  const hilo = async (tipo, asunto, creador, participantes, mensajes) => {
    const [x] = await pool.query('INSERT INTO hilos (tipo, asunto, creado_por) VALUES (?, ?, ?)', [tipo, asunto, creador]);
    let ultimo = 0;
    for (const [rem, cuerpo] of mensajes) {
      const [m] = await pool.query('INSERT INTO mensajes (hilo_id, remitente_id, cuerpo) VALUES (?, ?, ?)', [x.insertId, rem, cuerpo]);
      ultimo = m.insertId;
    }
    for (const [uid, leido] of participantes) await pool.query('INSERT INTO hilo_participantes (hilo_id, usuario_id, ultimo_leido_id) VALUES (?, ?, ?)', [x.insertId, uid, leido ? ultimo : null]);
  };
  await hilo('consulta', '¿Hasta qué hora está abierta la biblioteca?', lucia, [[lucia, false]], [
    [lucia, 'Hola, ¿hasta qué hora puedo pasar a devolver los libros los sábados?'],
    [staff, '¡Hola Lucía! Los sábados atendemos de 9 a 13 hs. Te esperamos.'],
  ]);
  await hilo('interno', 'Reposición de Sapiens', dueno, [[dueno, true], [staff, false]], [
    [dueno, 'Bruno, "Sapiens" se está prestando mucho. ¿Pedimos más ejemplares a la distribuidora?'],
  ]);
  console.log('✔ Datos de demostración cargados (préstamos, reservas, mensajes, un usuario bloqueado)');
}

main()
  .catch((e) => { console.error('✘ Error:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
