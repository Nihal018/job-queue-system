import { Worker } from "bullmq";
import { connection } from "../queues/jobQueue.js";

console.log("[Worker] Starting up...");

// ─── Processors ───────────────────────────────────────────────────

async function processEmailJob(job) {
  console.log(`[Worker] Email job ${job.id} — attempt ${job.attemptsMade + 1}`);

  await job.updateProgress(10);
  await sleep(500);

  // Simulate a flaky mail server — fails on first 2 attempts
  if (job.attemptsMade < 2) {
    throw new Error("Mail server temporarily unavailable");
  }

  await job.updateProgress(60);
  await sleep(500);

  await job.updateProgress(100);
  return { emailSentAt: new Date().toISOString() };
}

async function processImageResizeJob(job) {
  console.log(
    `[Worker] Image resize job ${job.id} — attempt ${job.attemptsMade + 1}`,
  );

  await job.updateProgress(0);
  await sleep(500);

  await job.updateProgress(50);
  await sleep(1000);

  await job.updateProgress(100);
  return {
    resizedAt: new Date().toISOString(),
    outputPath: "/tmp/resized.jpg",
  };
}

async function processDataExportJob(job) {
  console.log(`[Worker] Data export job ${job.id}`);

  const rows = 1000;
  for (let i = 0; i <= rows; i += 200) {
    await sleep(300);
    const pct = Math.round((i / rows) * 100);
    await job.updateProgress(pct);
  }

  return { exportedAt: new Date().toISOString(), rowCount: rows };
}

// Permanently broken — always throws, will exhaust all attempts
async function processBrokenJob(job) {
  console.log(
    `[Worker] Broken job ${job.id} — attempt ${job.attemptsMade + 1}`,
  );
  await sleep(300);
  throw new Error("This job always fails — bad input data");
}

// ─── Dispatcher ───────────────────────────────────────────────────

async function processJob(job) {
  switch (job.data.type) {
    case "email":
      return processEmailJob(job);
    case "image-resize":
      return processImageResizeJob(job);
    case "data-export":
      return processDataExportJob(job);
    case "broken":
      return processBrokenJob(job);
    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}

// ─── Worker ───────────────────────────────────────────────────────

const worker = new Worker("jobs", processJob, { connection });

worker.on("completed", (job) => {
  console.log(
    `[Worker] ✓ Job ${job.id} (${job.data.type}) completed after ${job.attemptsMade + 1} attempt(s)`,
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[Worker] ✗ Job ${job.id} attempt ${job.attemptsMade}/${job.opts.attempts} failed: ${err.message}`,
  );
});

worker.on("progress", (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

// ─── Utility ──────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
