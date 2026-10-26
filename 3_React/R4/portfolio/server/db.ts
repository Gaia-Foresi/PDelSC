import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
//  CONEXIÓN A LA BASE DE DATOS (TiDB Cloud / MySQL)
// ------------------------------------------------------------
//  Usamos un "pool": un grupo chico de conexiones que se
//  reutilizan. En Vercel cada función vive poco, por eso el
//  límite es bajo (3).
// ============================================================

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) return pool;

  const host = process.env.TIDB_HOST;
  if (!host) {
    throw new Error('Falta TIDB_HOST en las variables de entorno (.env o Vercel).');
  }

  // TiDB Cloud exige conexión segura (SSL). Para una base local
  // se puede desactivar con TIDB_SSL=false
  const useSsl = process.env.TIDB_SSL !== 'false';

  pool = mysql.createPool({
    host,
    port: Number(process.env.TIDB_PORT || 4000),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DB_NAME,
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 3,
    maxIdle: 3,
    idleTimeout: 60_000,
    enableKeepAlive: true,
  });

  return pool;
}

/** Ejecuta un SELECT y devuelve las filas. */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

/** Ejecuta INSERT / UPDATE / DELETE y devuelve info (insertId, affectedRows). */
export async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().query(sql, params);
  return result as mysql.ResultSetHeader;
}
