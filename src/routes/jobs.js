import { Router } from "express";
import { jobQueue } from "../queues/jobQueue.js";

const router = Router();

router.post("/", async (req, res) => {
  const { type = "email", duration = 5000 } = req.body;

  // add() puts a job description into Redis.
  // It returns immediately — no waiting for the job to run.
  const job = await jobQueue.add(
    type, // job name (used for labelling, not routing yet)
    { type, duration }, // data payload — the worker reads this
  );

  // We respond instantly. The client doesn't wait for the job.
  res.status(202).json({
    jobId: job.id,
    status: "queued",
    message: "Job accepted and queued for processing",
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { router as jobRoutes };
