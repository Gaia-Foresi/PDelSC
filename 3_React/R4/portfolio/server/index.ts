// Servidor para desarrollo local (npm run server) o para hostings
// que corren un proceso Node siempre prendido (Render, Railway...).
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import app from './app.js';
import { query } from './db.js';

const port = Number(process.env.PORT) || 3000;

// Si existe la carpeta dist (después de "npm run build"), también sirve la página
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(port, async () => {
  console.log(`🚀 Servidor en http://localhost:${port}  (API en /api)`);
  try {
    await query('SELECT 1');
    console.log('✅ Conexión a la base de datos OK');
  } catch (err: any) {
    console.error('❌ No se pudo conectar a la base de datos:', err.message);
  }
});
