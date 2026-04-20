import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
};

const jobQueue = new Queue("jobs", { connection });

export { jobQueue, connection };
