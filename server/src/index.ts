import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from "./config/db.ts";
import authRoutes from "./routes/auth.route.ts";
import reviewRoutes from "./routes/review.route.ts";
import testRoutes from "./routes/test.route.ts";


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", reviewRoutes);
app.use("/api", testRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

export default app;
