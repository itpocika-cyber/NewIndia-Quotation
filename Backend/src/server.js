import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './db/connection.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import customersRoutes from './routes/customers.js';
import productsRoutes from './routes/products.js';
import mastersRoutes from './routes/masters.js';
import quotationsRoutes from './routes/quotations.js';
import activityRoutes from './routes/activity.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../Frontend/dist');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://pocika-group.gitlab.io',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Pocika Quotation API',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`
  });
});

// Root & API Base endpoints (gives clear JSON info instead of 'Cannot GET /api/v1')
const apiInfoHandler = (req, res) => {
  res.json({
    success: true,
    name: 'Pocika Quotation Management API',
    version: '1.0.0',
    status: 'online',
    health: '/api/health',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      customers: '/api/v1/customers',
      products: '/api/v1/products',
      masters: '/api/v1/masters',
      quotations: '/api/v1/quotations',
      activity: '/api/v1/activity'
    }
  });
};

app.get('/api', apiInfoHandler);
app.get('/api/v1', apiInfoHandler);
if (!fs.existsSync(distPath)) {
  app.get('/', apiInfoHandler); // only show API info when frontend isn't built
}

// Rate limiter for user administration
const usersLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many user management requests from this IP. Please try again after 15 minutes.'
  }
});

// Reject API calls early when DB is down (PDF render routes are exempt - they use cached snapshots)
app.use('/api/v1', (req, res, next) => {
  if (req.originalUrl.includes('/render-pdf') || req.originalUrl.includes('/render-html')) {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database connection is temporarily unavailable. Verify your IP is whitelisted in MongoDB Atlas Network Access.',
      dbState: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    });
  }
  next();
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersLimiter, usersRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/masters', mastersRoutes);
app.use('/api/v1/quotations', quotationsRoutes);
app.use('/api/v1/activity', activityRoutes);

// Serve production frontend assets if built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 Catch-All Route for API (returns clean JSON instead of default Express HTML error)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Visit /api/v1 or /api/health for available endpoints.'
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
async function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`[Server] Pocika Quotation Server listening on port ${PORT}`);
    console.log(`[Server] Base API URL: http://localhost:${PORT}/api/v1`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[Server Error] Port ${PORT} is already in use by another running process.`);
      console.error(`[Server Info] Stop the existing backend process or change PORT in .env\n`);
    } else {
      console.error('[Server Error] Server startup error:', err.message);
    }
    process.exit(1);
  });

  // Attempt initial database connection asynchronously without crashing process on error
  try {
    await connectDB();
  } catch (err) {
    console.warn('[DB Warning] Initial MongoDB Atlas connection failed. Server is running; will keep retrying in background.');

    // Auto-retry connection every 6 seconds until connected
    const retryInterval = setInterval(async () => {
      if (mongoose.connection.readyState === 0) {
        try {
          await connectDB();
          clearInterval(retryInterval);
        } catch (e) {
          // Keep retrying in background without crashing the app
        }
      } else if (mongoose.connection.readyState === 1) {
        clearInterval(retryInterval);
      }
    }, 6000);
  }
}

startServer();

export default app;
