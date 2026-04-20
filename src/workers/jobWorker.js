import { Worker } from "bullmq";
import { connection } from "../queues/jobQueue.js";

console.log("[Worker] Starting up...");

// This simulates slow work — but notice it's now in the WORKER,
// not in the API request handler.
// The worker is a separate process, so it doesn't block the API.
function simulateSlowJob(jobType, durationMs) {
  console.log(
    `[Worker][${new Date().toISOString()}] Processing ${jobType} job...`,
  );

  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    // still a blocking spin for now — we'll fix this in Part 2 Day 2
  }

  console.log(
    `[Worker][${new Date().toISOString()}] Done with ${jobType} job.`,
  );
}

// Worker listens to the 'jobs' queue.
// The second argument is a processor function — called once per job.
const worker = new Worker(
  "jobs",
  async (job) => {
    const { type, duration } = job.data;

    simulateSlowJob(type, duration);

    // Whatever we return here becomes job.returnvalue
    return { processedAt: new Date().toISOString() };
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err.message);
});
