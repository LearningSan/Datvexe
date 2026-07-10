// src/lib/server/db.ts

import type { PoolConnection } from "mysql2/promise";

import pool from "@/db/db";


export async function query<T = unknown>(
  sql: string,
  params?: Record<string, any> | any[],
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);

  return rows as T[];
}

export async function withTransaction<T>(
  callback: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const result = await callback(conn);

    await conn.commit();

    return result;
  } catch (error) {
    await conn.rollback();

    throw error;
  } finally {
    conn.release();
  }
}

// ============================================================
// CONN QUERY
// dùng bên trong transaction
// ============================================================

export async function connQuery<T = unknown>(
  conn: PoolConnection,
  sql: string,
  params?: Record<string, any> | any[],
): Promise<T[]> {
  const [rows] = await conn.query(sql, params);

  return rows as T[];
}

export type { PoolConnection };
