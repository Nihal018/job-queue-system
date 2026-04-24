import { Worker } from "bullmq";
import { connection } from "../queues/jobQueue.js";

console.log("[Worker] Starting up...");

// ─── Job type processors ─────────────────────────────────────────

async function processEmailJob(job) {
  console.log(`[Worker] Sending email for job ${job.id}`);

  await job.updateProgress(10);
  await sleep(1000); // simulate: connecting to mail server

  await job.updateProgress(50);
  await sleep(1000); // simulate: rendering template

  await job.updateProgress(90);
  await sleep(500); // simulate: sending

  await job.updateProgress(100);

  return { emailSentAt: new Date().toISOString() };
}

async function processImageResizeJob(job) {
  console.log(`[Worker] Resizing image for job ${job.id}`);

  await job.updateProgress(0);
  await sleep(500); // simulate: loading image

  await job.updateProgress(30);
  await sleep(1500); // simulate: resizing

  await job.updateProgress(80);
  await sleep(500); // simulate: saving output

  await job.updateProgress(100);

  return {
    resizedAt: new Date().toISOString(),
    outputPath: "/tmp/resized.jpg",
  };
}

async function processDataExportJob(job) {
  console.log(`[Worker] Exporting data for job ${job.id}`);

  const rows = 1000;

  for (let i = 0; i <= rows; i += 200) {
    await sleep(400); // simulate: fetching a batch of rows
    const pct = Math.round((i / rows) * 100);
    await job.updateProgress(pct);
    console.log(`[Worker] Export progress: ${pct}%`);
  }

  return { exportedAt: new Date().toISOString(), rowCount: rows };
}

// ─── Router — dispatch to correct processor ───────────────────────

async function processJob(job) {
  switch (job.data.type) {
    case "email":
      return await processEmailJob(job);
    case "image-resize":
      return await processImageResizeJob(job);
    case "data-export":
      return await processDataExportJob(job);
    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}

// ─── Worker ───────────────────────────────────────────────────────

const worker = new Worker("jobs", processJob, { connection });

worker.on("completed", (job) => {
  console.log(`[Worker] ✓ Job ${job.id} (${job.data.type}) completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] ✗ Job ${job.id} failed: ${err.message}`);
});

worker.on("progress", (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

// ─── Utility ──────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
