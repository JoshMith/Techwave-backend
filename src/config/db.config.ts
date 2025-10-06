import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // For local development, comment out the ssl option
    // ssl: {
    //     rejectUnauthorized: false, // Required for Render
    // },
})
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Database connected:', result.rows);
  }
});

export default pool
