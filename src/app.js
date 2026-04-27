import express from "express";
import { jobRoutes } from "./routes/jobs.js";

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "job-queue-system" });
});

app.use("/api/jobs", jobRoutes);

export { app };
