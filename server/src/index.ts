import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from "./config/db";
import authRoutes from "./routes/auth.route";
import reviewRoutes from "./routes/review.route";
import paymentRoutes from "./routes/payment.route";
import razorpayRoutes from "./routes/razorpay.route";
import testRoutes from "./routes/test.route";
import testTemplateRoutes from "./routes/testTemplate.routes";
import { testService } from "./services/test.service";


const app = express();

app.use(cors());
app.use(express.json());


app.use((req, res, next) => {
  console.log(req.method, req.url, req.headers.origin);
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    // For MySQL, a simple query to check the connection
    const [rows] = await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});


// Student-specific routes should be checked before the more restrictive admin routes.
app.use("/api/auth", authRoutes); // Auth routes have no protection cause anyone should be able to register and login.
app.use("/api/test-templates", testTemplateRoutes); 
app.use("/api", testRoutes);      // Student test routes require authentication.
app.use("/api", paymentRoutes);
app.use("/api", razorpayRoutes);
app.use("/api", reviewRoutes);

// Start the auto-submit safety net check every minute.
// A 60-second interval is a bit friendlier for a free hosting plan.
testService.autoSubmitExpiredSessions(); // check immediately on start
setInterval(() => {
  testService.autoSubmitExpiredSessions();
}, 60000);




// Render provides the PORT environment variable
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
