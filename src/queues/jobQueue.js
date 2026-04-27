import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
};

const jobQueue = new Queue("jobs", {
  connection,
  defaultJobOptions,
});

export { jobQueue, connection };
