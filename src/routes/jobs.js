import { Router } from "express";
import { jobQueue } from "../queues/jobQueue.js";

const router = Router();

router.post("/", async (req, res) => {
  const { type = "email", payload = {} } = req.body;

  const validTypes = ["email", "image-resize", "data-export"];

  if (!validTypes.includes(type)) {
    return res
      .status(400)
      .json({
        error: `Invalid job type. Must be one of: ${validTypes.join(", ")}`,
      });
  }

  const job = await jobQueue.add(type, { type, ...payload });

  res.status(202).json({ jobId: job.id, status: "queued", type });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
