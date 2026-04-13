import express from "express";
import { jobRoutes } from "./routes/jobs.js";

const app = express();
app.use(express.json());

app.use("/api/jobs", jobRoutes);

export { app };
