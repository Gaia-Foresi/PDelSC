// ============================================================
//  npm run db:setup
// ------------------------------------------------------------
//  Crea las tablas (si no existen) y carga el contenido inicial
//  SOLO en las tablas que estén vacías. Se puede correr varias
//  veces sin miedo: nunca borra lo que ya cargaste.
// ============================================================
import { query, execute, getPool } from '../db.js';
import {
  TABLES,
  SEED_PERFIL,
  SEED_HABILIDADES,
  SEED_EXPERIENCIAS,
  SEED_PROYECTOS,
} from '../schema.js';

async function tableExists(name: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function count(table: string): Promise<number> {
  const rows = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(rows[0].n);
}

async function main() {
  console.log('🔌 Conectando a la base de datos...');
  await query('SELECT 1');
  console.log('✅ Conectado\n');

  // 1) Crear tablas
  for (const sql of TABLES) await execute(sql);
  console.log('✅ Tablas listas');

  // 2) Tabla "contactos" vieja → agregarle la columna "leido"
  if (!(await columnExists('contactos', 'leido'))) {
    await execute('ALTER TABLE contactos ADD COLUMN leido BOOLEAN NOT NULL DEFAULT FALSE');
    console.log('✅ Columna "leido" agregada a contactos');
  }

  // 3) Si existe la tabla vieja "contenido_portfolio", copiar lo que sirva
  if (await tableExists('contenido_portfolio')) {
    const map: Record<string, string> = {
      'about.p1': 'about_p1',
      'about.p2': 'about_p2',
      'about.p3': 'about_p3',
      'stats.years': 'stat_years',
      'stats.projects': 'stat_projects',
      'stats.techs': 'stat_techs',
    };
    const old = await query<{ seccion: string; clave: string; valor: string }>(
      'SELECT seccion, clave, valor FROM contenido_portfolio'
    );
    let migrated = 0;
    for (const row of old) {
      const nueva = map[`${row.seccion}.${row.clave}`];
      if (nueva && row.valor?.trim()) {
        await execute('INSERT IGNORE INTO perfil (clave, valor) VALUES (?, ?)', [nueva, row.valor]);
        migrated++;
      }
    }
    if (migrated) console.log(`✅ ${migrated} textos copiados desde contenido_portfolio`);
  }

  // 4) Perfil: agregar las claves que falten (no pisa las existentes)
  for (const [clave, valor] of Object.entries(SEED_PERFIL)) {
    await execute('INSERT IGNORE INTO perfil (clave, valor) VALUES (?, ?)', [clave, valor]);
  }
  console.log('✅ Perfil listo');

  // 5) Listas: solo si están vacías
  if ((await count('habilidades')) === 0) {
    let i = 0;
    for (const [nombre, nivel, categoria] of SEED_HABILIDADES) {
      await execute(
        'INSERT INTO habilidades (nombre, nivel, categoria, orden) VALUES (?, ?, ?, ?)',
        [nombre, nivel, categoria, i++]
      );
    }
    console.log(`✅ ${SEED_HABILIDADES.length} habilidades cargadas`);
  }

  if ((await count('experiencias')) === 0) {
    let i = 0;
    for (const e of SEED_EXPERIENCIAS) {
      await execute(
        'INSERT INTO experiencias (titulo, lugar, fecha, descripcion, tecnologias, orden) VALUES (?, ?, ?, ?, ?, ?)',
        [e.titulo, e.lugar, e.fecha, e.descripcion, e.tecnologias, i++]
      );
    }
    console.log(`✅ ${SEED_EXPERIENCIAS.length} experiencias cargadas`);
  }

  if ((await count('proyectos')) === 0) {
    let i = 0;
    for (const p of SEED_PROYECTOS) {
      await execute(
        `INSERT INTO proyectos (nombre, fecha, descripcion, tecnologias, caracteristicas, link, github, orden)
         VALUES (?, ?, ?, ?, ?, '', '', ?)`,
        [p.nombre, p.fecha, p.descripcion, p.tecnologias, p.caracteristicas, i++]
      );
    }
    console.log(`✅ ${SEED_PROYECTOS.length} proyectos cargados`);
  }

  // 6) Usuario admin
  if ((await count('admin_usuarios')) === 0) {
    console.log('\n⚠️  Todavía no hay ningún usuario admin.');
    console.log('   Creá uno con:  npm run admin:crear -- <usuario> <contraseña>\n');
  } else {
    const users = await query<{ username: string }>('SELECT username FROM admin_usuarios');
    console.log(`👤 Usuarios admin: ${users.map(u => u.username).join(', ')}`);
  }

  console.log('\n🎉 Base de datos lista.');
}

main()
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
