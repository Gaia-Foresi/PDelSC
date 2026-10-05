import express from 'express';
import cors from 'cors';
import { getPool } from '../server/db';
import routes from '../server/routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// Vercel necesita que exportemos el handler
export default app;