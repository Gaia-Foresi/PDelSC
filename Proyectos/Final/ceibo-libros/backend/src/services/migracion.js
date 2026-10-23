// Actualiza una base YA CREADA a la versión nueva, sin borrar datos. Es idempotente: se puede ejecutar siempre.
const { codigoRetiroUnico } = require('../utils/codigos');

async function migrar(pool) {
const existeColumna = async (tabla, columna) => {
  const [r] = await pool.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [tabla, columna]);
  return r.length > 0;
};
const existeIndice = async (tabla, indice) => {
  const [r] = await pool.query(
    'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', [tabla, indice]);
  return r.length > 0;
};

  const hechos = [];
  const agregar = async (tabla, columna, definicion) => {
    if (!(await existeColumna(tabla, columna))) {
      await pool.query(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
      hechos.push(`${tabla}.${columna}`);
    }
  };

  await agregar('usuarios', 'curso', 'VARCHAR(40) NULL AFTER telefono');
  await agregar('usuarios', 'dni', 'VARCHAR(15) NULL AFTER curso');

  // 1) Primero las columnas de las dos tablas (el generador de códigos consulta ambas)
  for (const tabla of ['reservas', 'prestamos']) {
    if (!(await existeColumna(tabla, 'codigo_retiro'))) {
      await pool.query(`ALTER TABLE ${tabla} ADD COLUMN codigo_retiro CHAR(6) NULL`);
      hechos.push(`${tabla}.codigo_retiro`);
    }
  }
  // 2) Los registros que ya existían reciben un código, y después la columna pasa a ser obligatoria y única
  for (const tabla of ['reservas', 'prestamos']) {
    const [filas] = await pool.query(`SELECT id FROM ${tabla} WHERE codigo_retiro IS NULL`);
    for (const f of filas) await pool.query(`UPDATE ${tabla} SET codigo_retiro = ? WHERE id = ?`, [await codigoRetiroUnico(pool), f.id]);
    await pool.query(`ALTER TABLE ${tabla} MODIFY codigo_retiro CHAR(6) NOT NULL`);
    const indice = `uq_${tabla}_codigo`;
    if (!(await existeIndice(tabla, indice))) await pool.query(`ALTER TABLE ${tabla} ADD UNIQUE KEY ${indice} (codigo_retiro)`);
  }

  // Fecha y hora de la visita a la biblioteca (reservas y préstamos)
  for (const tabla of ['reservas', 'prestamos']) {
    if (!(await existeColumna(tabla, 'visita_en'))) {
      await pool.query(`ALTER TABLE ${tabla} ADD COLUMN visita_en DATETIME NULL`);
      hechos.push(`${tabla}.visita_en`);
    }
  }
  // Lo que ya existía recibe una fecha razonable, y después la columna pasa a ser obligatoria
  await pool.query('UPDATE reservas SET visita_en = creada_en WHERE visita_en IS NULL');
  await pool.query("UPDATE prestamos SET visita_en = TIMESTAMP(fecha_inicio, '12:00:00') WHERE visita_en IS NULL");
  for (const tabla of ['reservas', 'prestamos']) {
    await pool.query(`ALTER TABLE ${tabla} MODIFY visita_en DATETIME NOT NULL`);
    const indice = `idx_${tabla}_visita`;
    if (!(await existeIndice(tabla, indice))) await pool.query(`ALTER TABLE ${tabla} ADD INDEX ${indice} (visita_en)`);
  }

  return hechos;
}

module.exports = { migrar };
