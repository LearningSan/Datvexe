// src/lib/server/mysql.ts

import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: Pool | undefined;
}

const pool: Pool =
  globalThis.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),

    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    database: process.env.DB_NAME,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,

    enableKeepAlive: true,

    keepAliveInitialDelay: 0,

    namedPlaceholders: true,

    timezone: "+07:00",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.mysqlPool = pool;
}

export default pool;