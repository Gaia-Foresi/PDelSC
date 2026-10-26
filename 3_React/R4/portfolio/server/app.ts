import express from 'express';
import cors from 'cors';
import routes from './routes.js';

// La misma app sirve para desarrollo local (server/index.ts)
// y para Vercel (api/index.ts)
const app = express();

app.use(cors());
app.use(express.json({ limit: '200kb' }));
app.use('/api', routes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de la API no encontrada.' });
});

export default app;
