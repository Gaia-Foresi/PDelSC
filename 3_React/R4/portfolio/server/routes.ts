import { Router } from 'express';
import { getConnection } from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from './middleware';

const router = Router();

// ========== RUTA: GUARDAR MENSAJES DE CONTACTO ==========
router.post('/contacto', async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;
    const db = getConnection();

    await db.execute(`CREATE TABLE IF NOT EXISTS contactos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      asunto VARCHAR(200) NOT NULL,
      mensaje TEXT NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.execute(
      'INSERT INTO contactos (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)',
      [nombre, email, asunto, mensaje]
    );

    res.status(201).json({ message: 'Mensaje guardado exitosamente' });
  } catch (error) {
    console.error('Error al guardar contacto:', error);
    res.status(500).json({ error: 'Error al guardar el mensaje' });
  }
});

// ========== RUTA: LOGIN DEL ADMIN ==========
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getConnection();

    const rows: any = await db.execute(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { user: user.username, role: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el login' });
  }
});

// ========== RUTA: OBTENER MENSAJES DE CONTACTO (solo admin) ==========
router.post('/admin/contactos', requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = getConnection();
    const rows: any = await db.execute('SELECT * FROM contactos ORDER BY creado_en DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({ error: 'Error al obtener los mensajes' });
  }
});

// ========== RUTA: ACTUALIZAR CONTENIDO (solo admin) ==========
router.post('/admin/contenido', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { seccion, clave, valor } = req.body;

    if (!seccion || !clave || valor === undefined) {
      return res.status(400).json({ error: 'Faltan datos: seccion, clave, valor' });
    }

    const db = getConnection();

    await db.execute(
      `INSERT INTO contenido_portfolio (seccion, clave, valor)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = CURRENT_TIMESTAMP`,
      [seccion, clave, valor]
    );

    res.json({ message: 'Contenido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ error: 'Error al actualizar el contenido' });
  }
});

// ========== RUTA: OBTENER CONTENIDO (público) ==========
router.post('/contenido', async (req, res) => {
  try {
    const db = getConnection();
    const rows: any = await db.execute('SELECT seccion, clave, valor FROM contenido_portfolio');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener el contenido' });
  }
});

// ========== RUTA: OBTENER CONTENIDO (admin) ==========
router.post('/admin/contenido/listar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const db = getConnection();
    const rows: any = await db.execute('SELECT seccion, clave, valor FROM contenido_portfolio');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener el contenido' });
  }
});

export default router;