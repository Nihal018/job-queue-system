import { Router } from "express";
import { jobQueue } from "../queues/jobQueue.js";

const router = Router();

const validTypes = ["email", "image-resize", "data-export", "broken"];

router.post("/", async (req, res) => {
  const { type = "email", payload = {}, delay = 0 } = req.body;

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid job type. Must be one of: ${validTypes.join(", ")}`,
    });
  }

  const jobOptions = {};

  if (delay > 0) {
    jobOptions.delay = delay; // milliseconds before job becomes eligible to run
  }

  const job = await jobQueue.add(type, { type, ...payload }, jobOptions);

  res.status(202).json({
    jobId: job.id,
    status: delay > 0 ? "delayed" : "queued",
    type,
    ...(delay > 0 && { runsAfter: new Date(Date.now() + delay).toISOString() }),
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.get("/failed/list", async (req, res) => {
  const failedJobs = await jobQueue.getFailed(0, 49);

  const formatted = failedJobs.map((job) => ({
    jobId: job.id,
    type: job.data.type,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
  }));

  res.json({ count: formatted.length, failedJobs: formatted });
});

router.post("/:id/retry", async (req, res) => {
  const job = await jobQueue.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "job not found" });
  }

  const state = await job.getState();

  if (state !== "failed") {
    return res.status(400).json({
      error: `Only failed jobs can be retried. current State: ${state}`,
    });
  }

  await job.retry();

  res.json({ jobId: job.id, message: "Job requeued for retry" });
});

router.get("/:id", async (req, res) => {
  const job = await jobQueue.getJob(req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const state = await job.getState();

  res.json({
    jobId: job.id,
    name: job.name,
    state, // 'waiting' | 'active' | 'completed' | 'failed'
    progress: job.progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    createdAt: new Date(job.timestamp).toISOString(),
    processedAt: job.processedOn
      ? new Date(job.processedOn).toISOString()
      : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
  });
});

export { router as jobRoutes };
