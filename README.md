# Job Queue System

A distributed job processing system built with Node.js, BullMQ, Redis, and Docker.

## Architecture

```
Client → API (Express) → Redis (BullMQ) → Worker Process
           ↑                                     ↓
           └──────── job state / progress ────────┘
```

## Features

- Submit jobs via REST API and get an instant 202 response
- Poll job status and progress in real time
- Multiple job types: `email`, `image-resize`, `data-export`
- Automatic retries with exponential backoff
- Delayed job scheduling
- Failed job inspection and manual retry
- Worker runs as a separate process — API never blocks
- Fully containerised with docker-compose

## Tech Stack

- **Runtime** — Node.js v22 (ES modules)
- **Framework** — Express
- **Queue** — BullMQ
- **Store** — Redis 7
- **Containers** — Docker + docker-compose

## Prerequisites

- Docker + docker-compose

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/job-queue-system
cd job-queue-system
cp .env.example .env
docker-compose up --build
```

API is available at `http://localhost:3000`.

## API Reference

### Submit a job

```
POST /api/jobs
Content-Type: application/json
```

Body options:

```json
{ "type": "email" }
{ "type": "image-resize" }
{ "type": "data-export" }
{ "type": "email", "delay": 10000 }
```

Response `202 Accepted`:

```json
{ "jobId": "1", "status": "queued", "type": "email" }
```

### Get job status

```
GET /api/jobs/:id
```

Response:

```json
{
  "jobId": "1",
  "state": "completed",
  "progress": 100,
  "data": { "type": "email" },
  "result": { "emailSentAt": "2025-01-01T00:00:00.000Z" },
  "failedReason": null,
  "attemptsMade": 3,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "processedAt": "2025-01-01T00:00:01.000Z",
  "finishedAt": "2025-01-01T00:00:04.000Z"
}
```

Possible `state` values: `waiting` · `active` · `completed` · `failed` · `delayed`

### List failed jobs

```
GET /api/jobs/failed/list
```

Response:

```json
{
  "count": 1,
  "jobs": [
    {
      "jobId": "3",
      "type": "broken",
      "failedReason": "This job always fails — bad input data",
      "attemptsMade": 3,
      "failedAt": "2025-01-01T00:00:10.000Z"
    }
  ]
}
```

### Retry a failed job

```
POST /api/jobs/:id/retry
```

Response:

```json
{ "jobId": "3", "message": "Job requeued for retry" }
```

### Health check

```
GET /api/jobs/health
```

Response:

```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

## Job Lifecycle

```
[waiting] → [active] → [completed]
               ↓
            throws?
               ↓
        attemptsMade < maxAttempts?
          yes → [waiting] after backoff delay
          no  → [failed]

[delayed] → (time passes) → [waiting] → ...
```

## Retry + Backoff Config

Jobs retry up to 3 times with exponential backoff:

```
Attempt 1 fails → wait 1s  → retry
Attempt 2 fails → wait 2s  → retry
Attempt 3 fails → wait 4s  → move to failed
```

Configured in `src/queues/jobQueue.js`:

```js
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
};
```

## Project Structure

```
src/
├── app.js                  Express app setup
├── server.js               HTTP server entry point
├── queues/
│   └── jobQueue.js         BullMQ queue + default job options
├── routes/
│   └── jobs.js             API routes
└── workers/
    └── jobWorker.js        Worker process (runs separately)
Dockerfile.api
Dockerfile.worker
docker-compose.yml
.env.example
```

## Environment Variables

Copy `.env.example` to `.env` and set:

```
PORT=3000
NODE_ENV=development
REDIS_HOST=redis
REDIS_PORT=6379
```

> Note: `REDIS_HOST=redis` refers to the Redis service name in docker-compose, not localhost.

## Running Without Docker

If you have Redis running locally:

```bash
# Update .env
REDIS_HOST=localhost

# Terminal 1 — API
npm start

# Terminal 2 — Worker
npm run worker
```

## Key Design Decisions

**Why a job queue?**
Node.js runs on a single thread. Running slow tasks (email sending, image processing) inside a request handler blocks the entire server for every other user. A queue hands the task off to a worker process so the API responds instantly.

**Why BullMQ + Redis?**
Redis persists job state. If the worker crashes mid-job, the job isn't lost — BullMQ picks it up on restart. BullMQ also handles retries, delays, and concurrency on top of that persistence.

**Why separate processes?**
Isolation. A crashing worker doesn't take down the API. Workers can be scaled independently — run 5 worker containers, 1 API container.

**Why 202 and not 200?**
HTTP 202 means "Accepted" — the server received the request but hasn't processed it yet. 200 means "Done". Since the job is queued (not complete), 202 is semantically correct.

## Live Demo

API: `https://job-queue-system-production.up.railway.app/`
