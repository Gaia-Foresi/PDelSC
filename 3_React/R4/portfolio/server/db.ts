import { connect } from '@tidbcloud/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Creamos una conexión única que se reutiliza entre invocaciones
let connection: ReturnType<typeof connect> | null = null;

export function getConnection() {
  if (!connection) {
    const url = `mysql://${process.env.TIDB_USER}:${process.env.TIDB_PASSWORD}@${process.env.TIDB_HOST}:${process.env.TIDB_PORT}/${process.env.TIDB_DB_NAME}`;
    
    connection = connect({
      url: url,
    });
    
    console.log('🔌 Conexión serverless a TiDB creada.');
  }
  return connection;
}

// Mantenemos getPool como alias para no romper los imports existentes
// (pero devuelve la conexión serverless)
export function getPool() {
  return getConnection();
}