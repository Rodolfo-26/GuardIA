import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL para conectar con PostgreSQL.");
}

export const pool = new Pool({
  connectionString,
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}
