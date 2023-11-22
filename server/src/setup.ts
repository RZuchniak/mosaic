import { pool } from "./database";
import fs from "node:fs";

async function main() {
  const sql = fs.readFileSync("./src/scripts/setup.sql", "utf-8");

  await pool.query(sql);
}

main();
