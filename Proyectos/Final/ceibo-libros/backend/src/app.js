// Aplicación Express: seguridad, parsing, solo-POST, rutas y manejo de errores.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from './config/env.js';
import { soloPost, noEncontrado, manejarErrores } from './middlewares/errores.js';
import { limiteGeneral } from './middlewares/limites.js';
import rutas from './routes/index.js';

const { corsOrigin } = env;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás del proxy del hosting (Render, Railway...) para que el límite de peticiones use la IP real

app.use(helmet());
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()), methods: ['POST', 'OPTIONS'] }));
app.use(express.json({ limit: '500kb' }));
app.use(soloPost);          // cualquier método distinto de POST -> 405
app.use('/api', limiteGeneral, rutas);
app.use(noEncontrado);
app.use(manejarErrores);

export default app;
