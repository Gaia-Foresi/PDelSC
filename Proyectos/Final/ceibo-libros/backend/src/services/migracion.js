// Actualiza una base YA CREADA a la versión nueva, sin borrar datos. Es idempotente: se puede ejecutar siempre.
import { codigoRetiroUnico } from '../utils/codigos.js';

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

  await agregar('usuarios', 'tipo_bloqueo', "ENUM('atraso','dano') NULL AFTER motivo_bloqueo");
  // Los bloqueos anteriores a este cambio eran por atraso
  await pool.query("UPDATE usuarios SET tipo_bloqueo = 'atraso' WHERE estado = 'bloqueado' AND tipo_bloqueo IS NULL");
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

  // Conversaciones que el personal puede ocultar
  await agregar('hilo_participantes', 'oculto', 'TINYINT(1) NOT NULL DEFAULT 0');

  // Libros en más de una categoría
  await pool.query(`CREATE TABLE IF NOT EXISTS libro_categorias (
    libro_id INT UNSIGNED NOT NULL, categoria_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (libro_id, categoria_id),
    CONSTRAINT fk_lc_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE,
    CONSTRAINT fk_lc_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Historial de ediciones de préstamos (extensiones de plazo)
  await pool.query(`CREATE TABLE IF NOT EXISTS prestamo_ediciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prestamo_id INT UNSIGNED NOT NULL, usuario_id INT UNSIGNED NOT NULL,
    accion VARCHAR(30) NOT NULL, detalle VARCHAR(255) NOT NULL,
    vencimiento_anterior DATE NULL, vencimiento_nuevo DATE NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ediciones_prestamo (prestamo_id, id),
    CONSTRAINT fk_ediciones_prestamo FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
    CONSTRAINT fk_ediciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Devoluciones: el libro devuelto queda "en espera" hasta que el personal lo repone al stock o lo da de baja por daño
  await agregar('prestamo_items', 'revision', "ENUM('pendiente','repuesto','danado') NULL AFTER devuelto_en");
  await agregar('prestamo_items', 'revisado_en', 'DATETIME NULL AFTER revision');
  await agregar('prestamo_items', 'revisado_por', 'INT UNSIGNED NULL AFTER revisado_en');
  await agregar('prestamo_items', 'repuesto_en', 'DATETIME NULL AFTER revisado_por'); // cuándo se repuso un ejemplar dañado
  // Lo que se devolvió antes de este cambio ya estaba de vuelta en el stock
  await pool.query("UPDATE prestamo_items SET revision = 'repuesto' WHERE devuelto_en IS NOT NULL AND revision IS NULL");

  // Renovación de sesión: se anota cuándo se usó cada token para tolerar dos pedidos casi simultáneos
  await agregar('refresh_tokens', 'revocado_en', 'DATETIME NULL AFTER revocado');
  await pool.query('UPDATE refresh_tokens SET revocado_en = creado_en WHERE revocado = 1 AND revocado_en IS NULL');

  // Bases creadas con el nombre anterior del rol de más alto nivel (id 1): pasa a llamarse "gerente".
  // El nombre viejo no se escribe acá: el rol se busca por su id y la columna por su clave foránea a usuarios.
  await pool.query("UPDATE roles SET nombre = 'gerente' WHERE id = 1 AND nombre <> 'gerente'");
  const [viejas] = await pool.query(
    `SELECT COLUMN_NAME AS columna, CONSTRAINT_NAME AS fk FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos_reposicion' AND REFERENCED_TABLE_NAME = 'usuarios'
       AND COLUMN_NAME <> 'gerente_id' AND COLUMN_NAME LIKE '%\\_id'`);
  if (viejas.length && !(await existeColumna('pedidos_reposicion', 'gerente_id'))) {
    const { columna, fk } = viejas[0];
    try { await pool.query(`ALTER TABLE pedidos_reposicion DROP FOREIGN KEY \`${fk}\``); } catch (e) { /* ya no estaba */ }
    await pool.query(`ALTER TABLE pedidos_reposicion CHANGE \`${columna}\` gerente_id INT UNSIGNED NOT NULL`);
    await pool.query('ALTER TABLE pedidos_reposicion ADD CONSTRAINT fk_pedidos_gerente FOREIGN KEY (gerente_id) REFERENCES usuarios(id)');
    hechos.push('pedidos_reposicion.gerente_id');
  }

  // Notificaciones push: nuevos tipos de aviso del préstamo y tabla de celulares registrados
  await pool.query(
    `ALTER TABLE notificaciones MODIFY tipo ENUM('recordatorio_devolucion','vencimiento','bloqueo','desbloqueo','reserva','sistema',
     'prestamo_nuevo','prestamo_espera','prestamo_cerrado') NOT NULL`);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS dispositivos_push (
       id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       usuario_id     INT UNSIGNED NOT NULL,
       token          VARCHAR(200) NOT NULL,
       plataforma     VARCHAR(10) NOT NULL DEFAULT 'android',
       actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE KEY uq_push_token (token),
       INDEX idx_push_usuario (usuario_id),
       CONSTRAINT fk_push_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  return hechos;
}

export { migrar };
