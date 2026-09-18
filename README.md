# API Endpoint Uptime & Performance Monitor

A lightweight, full-stack web application for monitoring HTTP endpoints in real-time. Automatically checks availability, measures latency, records response metrics in SQLite, and displays live status and history on a clean dashboard.

---

## Features

- **Automated Health Checks**: Background scheduler periodically pings active endpoints at their configured interval (10s, 15s, 30s, 60s, 300s).
- **Accurate Performance Metrics**: Measures real-time latency with millisecond precision (`performance.now()`).
- **Uptime Tracking**: Computes rolling 24-hour uptime percentages and min/max/average response times.
- **Robust Error Handling**: Accurately classifies DNS failures (`ENOTFOUND`), request timeouts (`AbortController`), connection issues (`ECONNREFUSED`), and HTTP status mismatches (e.g. 500 Internal Server Error).
- **History Retention**: Automatically retains the latest 100 checks per endpoint in SQLite to prevent unbounded growth.
- **On-Demand "Check Now"**: Immediate manual test button with instant UI updates.
- **Modern Dashboard UI**:
  - Top summary cards: Monitored endpoints, online count, failing count, 24h average uptime, and system average latency.
  - Live pulsing status indicator with auto-refresh polling every 5 seconds.
  - Endpoint cards with color-coded status badges (`UP (200)`, `DOWN (500)`, `DOWN (DNS)`).
  - Clean SVG sparklines showing recent response time trends and failure dots.
  - Search and filter tabs (All, Online, Failing, Paused).
  - Add / Edit modal with input validation.
  - Endpoint detail modal with min/max/avg latency strip, sparkline, and full scrollable check log table.
  - One-click sample seed data (healthy production APIs, mock endpoints, 500 error test, and DNS failure test).

---

## Tech Stack

- **Backend**: Node.js + Express (ES Modules)
- **Database**: SQLite via Node.js built-in `node:sqlite` (`DatabaseSync` - zero native compile dependencies)
- **Frontend**: React 19 + Vite + Vanilla CSS (dark-mode slate palette, responsive grid)
- **Scheduler**: Lightweight non-overlapping interval runner (`server/scheduler.js`)

---

## Project Structure

```
.
├── server/
│   ├── db.js              # SQLite database schema, queries, metrics & retention pruning
│   ├── pingEngine.js      # HTTP fetcher, latency timer, timeout & DNS error handling
│   ├── scheduler.js       # Periodic interval runner with overlap prevention
│   ├── routes.js          # Express REST API routes
│   ├── seedData.js        # Built-in sample endpoints (GitHub, JSONPlaceholder, HTTPBin 200/500, DNS test)
│   └── index.js           # Server entry point & static file hosting
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Header with live pulse indicator & action buttons
│   │   │   ├── MetricsOverview.jsx     # Overview banner (Total, Up, Down, 24h Uptime, Latency)
│   │   │   ├── EndpointCard.jsx        # Endpoint card with status badge, sparkline & actions
│   │   │   ├── Sparkline.jsx           # Clean SVG sparkline with failure dots
│   │   │   ├── EndpointDetailModal.jsx # Detail modal with stats strip & check logs table
│   │   │   ├── EndpointModal.jsx       # Add / Edit endpoint modal form
│   │   │   └── StatusBadge.jsx         # UP / DOWN / PENDING badge with pulse dot
│   │   ├── api.js                      # REST API client
│   │   ├── App.jsx                     # Main dashboard container & polling logic
│   │   ├── index.css                   # Cohesive dark-mode CSS design system
│   │   └── main.jsx                    # React entry point
│   ├── index.html                      # HTML root with Inter & JetBrains Mono fonts
│   ├── vite.config.js                  # Vite configuration with API proxy to port 3001
│   └── package.json                    # Client dependencies
├── package.json           # Root configuration with dev/build/start scripts
└── README.md              # Documentation
```

---

## Getting Started

### Prerequisites

- Node.js v22.5.0 or higher (v25+ recommended for built-in `node:sqlite`)
- npm v10+

### Installation

1. Install root and client dependencies:
   ```bash
   npm install && cd client && npm install && cd ..
   ```

2. Build the client bundle (optional for single-server production mode):
   ```bash
   npm run build
   ```

---

## Running the Application

### Option 1: Single Command (Production / Standalone Mode)

Build the client and start the Express server on port `3001` (Express serves both the API and the React frontend):

```bash
npm run build
npm start
```

Open your browser and navigate to:
```
http://localhost:3001
```

### Option 2: Development Mode (Hot Reloading)

Run both the backend watcher and the Vite frontend dev server concurrently:

```bash
npm run dev
```

- Frontend: `http://localhost:5173` (with automated `/api` proxy to backend)
- Backend API: `http://localhost:3001`

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats/overview` | Overall system metrics (total, up, down, avg 24h uptime, avg latency) |
| `GET` | `/api/endpoints` | List all endpoints with 24h stats and sparkline history |
| `GET` | `/api/endpoints/:id` | Get endpoint detail with min/max/avg latency and up to 100 check logs |
| `POST` | `/api/endpoints` | Add a new endpoint (immediately triggers an initial health check) |
| `PUT` | `/api/endpoints/:id` | Update endpoint settings (name, url, method, interval, expected status, is_active) |
| `DELETE` | `/api/endpoints/:id` | Delete endpoint and cascade-remove its check history |
| `POST` | `/api/endpoints/:id/check` | Trigger an immediate on-demand health check |
| `POST` | `/api/seed` | Seed default test endpoints (`{ "force": true }` to reset) |

### Sample Payload for `POST /api/endpoints`

```json
{
  "name": "Stripe API Health",
  "url": "https://api.stripe.com/healthcheck",
  "method": "GET",
  "expected_status": 200,
  "check_interval": 15,
  "timeout_ms": 8000,
  "is_active": true
}
```

---

## Sample Test Endpoints Included

When the application starts for the first time, it automatically seeds 5 diverse endpoints:

1. **GitHub API** (`https://api.github.com`): Verifies healthy public REST APIs (`UP (200)`).
2. **JSONPlaceholder (Posts)** (`https://jsonplaceholder.typicode.com/posts`): Fast response endpoint (`UP (200)`).
3. **HTTPBin Status 200** (`https://httpbin.org/status/200`): Standard status validation (`UP (200)`).
4. **HTTPBin Status 500** (`https://httpbin.org/status/500`): Demonstrates server error detection (`DOWN (500)`).
5. **DNS Failure Test** (`https://this-host-definitely-does-not-exist-test.xyz`): Demonstrates unresolvable hostname detection (`DOWN (DNS)`).
