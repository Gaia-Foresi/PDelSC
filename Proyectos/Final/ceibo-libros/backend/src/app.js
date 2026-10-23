// Aplicación Express: seguridad, parsing, solo-POST, rutas y manejo de errores.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { corsOrigin } = require('./config/env');
const { soloPost, noEncontrado, manejarErrores } = require('./middlewares/errores');
const { limiteGeneral } = require('./middlewares/limites');
const rutas = require('./routes');

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

module.exports = app;
