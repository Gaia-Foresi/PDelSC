import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, execute } from './db.js';
import { PERFIL_CLAVES } from './schema.js';
import {
  requireAuth,
  AuthRequest,
  getJwtSecret,
  loginRateLimit,
  resetLoginAttempts,
} from './middleware.js';

const router = Router();

// ------------------------------------------------------------
//  Utilidades
// ------------------------------------------------------------
const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Envuelve un handler async para que cualquier error devuelva 500 con un mensaje claro */
const handle =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await fn(req as AuthRequest, res);
    } catch (err: any) {
      console.error(`❌ ${req.method} ${req.originalUrl}:`, err?.message || err);
      res.status(500).json({ error: 'Error del servidor. Revisá la conexión a la base de datos.' });
    }
  };

// ------------------------------------------------------------
//  Recursos con lista (habilidades / experiencias / proyectos)
//  Define qué campos se pueden editar en cada tabla.
// ------------------------------------------------------------
type Field = { name: string; max: number; required?: boolean; type?: 'int' };

const RESOURCES: Record<string, { table: string; fields: Field[] }> = {
  habilidades: {
    table: 'habilidades',
    fields: [
      { name: 'nombre', max: 80, required: true },
      { name: 'nivel', max: 1, type: 'int' },
      { name: 'categoria', max: 30, required: true },
    ],
  },
  experiencias: {
    table: 'experiencias',
    fields: [
      { name: 'titulo', max: 150, required: true },
      { name: 'lugar', max: 150 },
      { name: 'fecha', max: 50 },
      { name: 'descripcion', max: 5000 },
      { name: 'tecnologias', max: 255 },
    ],
  },
  proyectos: {
    table: 'proyectos',
    fields: [
      { name: 'nombre', max: 150, required: true },
      { name: 'fecha', max: 50 },
      { name: 'descripcion', max: 5000 },
      { name: 'tecnologias', max: 255 },
      { name: 'caracteristicas', max: 5000 },
      { name: 'link', max: 255 },
      { name: 'github', max: 255 },
    ],
  },
};

function readFields(body: any, fields: Field[]): { values: any[]; error?: string } {
  const values: any[] = [];
  for (const f of fields) {
    if (f.type === 'int') {
      const n = Math.round(Number(body?.[f.name]));
      values.push(Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3);
      continue;
    }
    const v = str(body?.[f.name], f.max);
    if (f.required && !v) return { values, error: `El campo "${f.name}" es obligatorio.` };
    values.push(v);
  }
  return { values };
}

async function loadAllContent() {
  const [perfilRows, habilidades, experiencias, proyectos] = await Promise.all([
    query<{ clave: string; valor: string }>('SELECT clave, valor FROM perfil'),
    query('SELECT id, nombre, nivel, categoria, orden FROM habilidades ORDER BY orden, id'),
    query('SELECT * FROM experiencias ORDER BY orden, id'),
    query('SELECT * FROM proyectos ORDER BY orden, id'),
  ]);
  const perfil: Record<string, string> = {};
  perfilRows.forEach(r => (perfil[r.clave] = r.valor));
  return { perfil, habilidades, experiencias, proyectos };
}

// ============================================================
//  RUTAS PÚBLICAS
// ============================================================

// Estado del servidor y la base (útil para probar el hosting)
router.get(
  '/health',
  handle(async (_req, res) => {
    await query('SELECT 1');
    res.json({ ok: true, db: 'conectada' });
  })
);

// Todo el contenido del portfolio en un solo pedido
router.get(
  '/contenido',
  handle(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await loadAllContent());
  })
);

// Formulario de contacto
router.post(
  '/contacto',
  handle(async (req, res) => {
    const nombre = str(req.body?.nombre, 100);
    const email = str(req.body?.email, 100);
    const asunto = str(req.body?.asunto, 200);
    const mensaje = str(req.body?.mensaje, 2000);

    if (nombre.length < 2 || !isEmail(email) || asunto.length < 3 || mensaje.length < 10) {
      return res.status(400).json({ error: 'Revisá los datos del formulario.' });
    }
    // Campo trampa anti-spam: los humanos no lo ven, los bots lo completan
    if (str(req.body?.website)) return res.status(201).json({ ok: true });

    await execute('INSERT INTO contactos (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)', [
      nombre,
      email,
      asunto,
      mensaje,
    ]);
    res.status(201).json({ ok: true });
  })
);

// ============================================================
//  LOGIN
// ============================================================
router.post(
  '/admin/login',
  loginRateLimit,
  handle(async (req, res) => {
    const username = str(req.body?.username, 50);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const rows = await query<{ id: number; username: string; password_hash: string }>(
      'SELECT id, username, password_hash FROM admin_usuarios WHERE username = ?',
      [username]
    );
    const user = rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

    resetLoginAttempts(req);
    const token = jwt.sign({ id: user.id, username: user.username }, getJwtSecret(), {
      expiresIn: '8h',
    });
    res.json({ token, username: user.username });
  })
);

// ============================================================
//  RUTAS DEL ADMIN (todas requieren token)
// ============================================================
router.use('/admin', requireAuth);

router.get(
  '/admin/me',
  handle(async (req, res) => {
    res.json({ username: req.admin!.username });
  })
);

router.get(
  '/admin/contenido',
  handle(async (_req, res) => {
    res.json(await loadAllContent());
  })
);

// ---------- Perfil (textos sueltos) ----------
router.put(
  '/admin/perfil',
  handle(async (req, res) => {
    const body = req.body || {};
    let saved = 0;
    for (const clave of PERFIL_CLAVES) {
      if (typeof body[clave] === 'string') {
        await execute(
          `INSERT INTO perfil (clave, valor) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
          [clave, str(body[clave], 3000)]
        );
        saved++;
      }
    }
    res.json({ ok: true, saved });
  })
);

// ---------- Mensajes de contacto ----------
router.get(
  '/admin/contactos',
  handle(async (_req, res) => {
    res.json(await query('SELECT * FROM contactos ORDER BY creado_en DESC, id DESC'));
  })
);

router.patch(
  '/admin/contactos/:id',
  handle(async (req, res) => {
    await execute('UPDATE contactos SET leido = ? WHERE id = ?', [
      req.body?.leido ? 1 : 0,
      Number(req.params.id),
    ]);
    res.json({ ok: true });
  })
);

router.delete(
  '/admin/contactos/:id',
  handle(async (req, res) => {
    await execute('DELETE FROM contactos WHERE id = ?', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

// ---------- Cambiar contraseña ----------
router.put(
  '/admin/password',
  handle(async (req, res) => {
    const actual = String(req.body?.actual || '');
    const nueva = String(req.body?.nueva || '');
    if (nueva.length < 8) {
      return res.status(400).json({ error: 'La contraseña nueva necesita al menos 8 caracteres.' });
    }
    const rows = await query<{ password_hash: string }>(
      'SELECT password_hash FROM admin_usuarios WHERE id = ?',
      [req.admin!.id]
    );
    if (!rows[0] || !(await bcrypt.compare(actual, rows[0].password_hash))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    await execute('UPDATE admin_usuarios SET password_hash = ? WHERE id = ?', [
      await bcrypt.hash(nueva, 12),
      req.admin!.id,
    ]);
    res.json({ ok: true });
  })
);

// ---------- CRUD genérico: habilidades / experiencias / proyectos ----------
function resourceOr404(req: Request, res: Response) {
  const recurso = req.params.recurso;
  const r = RESOURCES[Array.isArray(recurso) ? recurso[0] : recurso];
  if (!r) res.status(404).json({ error: 'Sección desconocida.' });
  return r;
}

// Reordenar: recibe { ids: [3, 1, 2] }
router.put(
  '/admin/:recurso/orden',
  handle(async (req, res) => {
    const r = resourceOr404(req, res);
    if (!r) return;
    const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
    for (let i = 0; i < ids.length; i++) {
      await execute(`UPDATE ${r.table} SET orden = ? WHERE id = ?`, [i, ids[i]]);
    }
    res.json({ ok: true });
  })
);

router.post(
  '/admin/:recurso',
  handle(async (req, res) => {
    const r = resourceOr404(req, res);
    if (!r) return;
    const { values, error } = readFields(req.body, r.fields);
    if (error) return res.status(400).json({ error });

    const max = await query<{ m: number | null }>(`SELECT MAX(orden) AS m FROM ${r.table}`);
    const orden = (max[0]?.m ?? -1) + 1;
    const cols = r.fields.map(f => f.name).join(', ');
    const marks = r.fields.map(() => '?').join(', ');

    const result = await execute(
      `INSERT INTO ${r.table} (${cols}, orden) VALUES (${marks}, ?)`,
      [...values, orden]
    );
    res.status(201).json({ ok: true, id: result.insertId });
  })
);

router.put(
  '/admin/:recurso/:id',
  handle(async (req, res) => {
    const r = resourceOr404(req, res);
    if (!r) return;
    const { values, error } = readFields(req.body, r.fields);
    if (error) return res.status(400).json({ error });

    const sets = r.fields.map(f => `${f.name} = ?`).join(', ');
    await execute(`UPDATE ${r.table} SET ${sets} WHERE id = ?`, [...values, Number(req.params.id)]);
    res.json({ ok: true });
  })
);

router.delete(
  '/admin/:recurso/:id',
  handle(async (req, res) => {
    const r = resourceOr404(req, res);
    if (!r) return;
    await execute(`DELETE FROM ${r.table} WHERE id = ?`, [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

export default router;
