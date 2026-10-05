import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool } from './db';
import routes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.listen(port, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);

  getPool()
    .getConnection()
    .then(conn => {
      console.log('✅ Conexión a TiDB exitosa');
      conn.release();
    })
    .catch(err => {
      console.error('❌ Error al conectar a TiDB:', err.message);
    });
});