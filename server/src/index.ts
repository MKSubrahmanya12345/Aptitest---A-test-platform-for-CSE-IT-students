import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from "./config/db.ts";
import authRoutes from "./routes/auth.route.ts";
import reviewRoutes from "./routes/review.route.ts";
import testRoutes from "./routes/test.route.ts";
import { testService } from "./services/test.service.ts";


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", reviewRoutes);
app.use("/api", testRoutes);

// Start the auto-submit safety net check every minute.
// A 60-second interval is a bit friendlier for a free hosting plan.
testService.autoSubmitExpiredSessions(); // check immediately on start
setInterval(() => {
  testService.autoSubmitExpiredSessions();
}, 60000);

app.get('/api/health', async (req, res) => {
  try {
    // For MySQL, a simple query to check the connection
    const [rows] = await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// Render provides the PORT environment variable
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
