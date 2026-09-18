import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { seedDatabase } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for development
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api', routes);

// Serve frontend build if exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start Server
const server = app.listen(PORT, async () => {
  console.log(`🚀 API Monitor Server running at http://localhost:${PORT}`);

  // Automatically seed sample data if database is brand new
  try {
    const seedResult = await seedDatabase(false);
    if (seedResult.seeded) {
      console.log(`🌱 Initialized database with ${seedResult.count} sample endpoints.`);
    }
  } catch (err) {
    console.error('Failed to auto-seed database:', err.message);
  }

  // Start background scheduler tick loop
  startScheduler(2000);
});

// Graceful shutdown
function handleShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Shutting down cleanly...`);
  stopScheduler();
  server.close(() => {
    console.log('[Server] Closed remaining connections.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
