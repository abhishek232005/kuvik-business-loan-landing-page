import mysql from "mysql2/promise";
import config from "../config/env.js";

const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ...(config.database.ssl ? { ssl: config.database.ssl } : {}),
  connectionLimit: config.database.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  timezone: "Z",
  charset: "utf8mb4",
});

export default pool;
