import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testService } from '../../src/services/test.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // It's a good practice to secure your cron job endpoint.
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send('Unauthorized');
  }

  try {
    await testService.autoSubmitExpiredSessions();
    res.status(200).send('Cron job executed successfully.');
  } catch (error: any) {
    console.error("Error in auto-submit cron job:", error);
    res.status(500).send(`Cron job failed: ${error.message}`);
  }
}

