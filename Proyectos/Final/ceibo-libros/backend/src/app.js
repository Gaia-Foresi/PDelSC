// Aplicación Express: seguridad, parsing, solo-POST, rutas y manejo de errores.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from './config/env.js';
import { soloPost, noEncontrado, manejarErrores } from './middlewares/errores.js';
import { limiteGeneral } from './middlewares/limites.js';
import rutas from './routes/index.js';

// Sacamos de la configuración los orígenes (sitios/apps) que pueden llamar a la API.
const { corsOrigin } = env;

// Creamos la aplicación. "app.use(...)" agrega pasos (middlewares) que se ejecutan EN ORDEN en cada pedido.
const app = express();
// No mostramos que usamos Express (le da menos pistas a un atacante).
app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás del proxy del hosting (Render, Railway...) para que el límite de peticiones use la IP real

// helmet agrega cabeceras de seguridad a cada respuesta.
app.use(helmet());
// CORS: decide qué sitios pueden usar la API desde el navegador. Solo permitimos POST.
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()), methods: ['POST', 'OPTIONS'] }));
// El análisis de informes recibe Excel en base64, así que esa ruta admite cuerpos más grandes (se valida el total en la ruta)
app.use('/api/estadisticas/analizar', express.json({ limit: '8mb' }));
// Convierte el cuerpo JSON del pedido en un objeto (req.body), hasta 500 kb.
app.use(express.json({ limit: '500kb' }));
app.use(soloPost);          // cualquier método distinto de POST -> 405
// Todas las rutas empiezan con /api y pasan por el límite general de pedidos.
app.use('/api', limiteGeneral, rutas);
// Si ninguna ruta respondió, la ruta no existe (404). Y al final, el manejador de errores.
app.use(noEncontrado);
app.use(manejarErrores);

export default app;
