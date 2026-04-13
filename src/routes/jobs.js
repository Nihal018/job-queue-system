import { Router } from "express";

const router = Router();

function simulateSlowJob(jobType, durationMs) {
  console.log(`[${new Date().toISOString()}] Starting ${jobType} job...`);

  // This is a CPU-blocking loop. It does nothing useful.
  // It just burns time synchronously — no await, no callbacks.
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    // spinning...
  }

  console.log(`[${new Date().toISOString()}] Finished ${jobType} job.`);
}

router.post("/", (req, res) => {
  const { type = "email", duration = 5000 } = req.body;
  simulateSlowJob(type, duration);

  res.json({
    status: "done",
    type,
    duration,
    meddage: `Job completed synchronously in ${duration} ms`,
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { router as jobRoutes };
