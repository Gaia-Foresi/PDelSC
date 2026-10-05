import { Router } from 'express';
import { getPool } from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from './middleware';

const router = Router();

// ========== RUTA: GUARDAR MENSAJES DE CONTACTO ==========
router.post('/contacto', async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        asunto VARCHAR(200) NOT NULL,
        mensaje TEXT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const query = 'INSERT INTO contactos (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)';
    await pool.query(query, [nombre, email, asunto, mensaje]);

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
    const pool = getPool();

    const [rows]: any = await pool.query(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
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
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM contactos ORDER BY creado_en DESC');
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

    const pool = getPool();

    await pool.query(`
      INSERT INTO contenido_portfolio (seccion, clave, valor)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = CURRENT_TIMESTAMP
    `, [seccion, clave, valor]);

    res.json({ message: 'Contenido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ error: 'Error al actualizar el contenido' });
  }
});

// ========== RUTA: OBTENER CONTENIDO (público) ==========
router.post('/contenido', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT seccion, clave, valor FROM contenido_portfolio');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener el contenido' });
  }
});

// ========== RUTA: OBTENER CONTENIDO (admin - para el panel) ==========
router.post('/admin/contenido/listar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT seccion, clave, valor FROM contenido_portfolio');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener el contenido' });
  }
});

export default router;