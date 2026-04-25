require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initDb, pool } = require('./db');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT;

app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000', 'http://frontend:80'] }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);

// Health Probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', db: 'connected' });
  } catch (err) {
    // Database readiness check failed
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Log error for monitoring
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
const startServer = async () => {
  await initDb();
  const server = app.listen(PORT, () => {
    // User Service started successfully
  });

  // Graceful shutdown
  const shutdown = () => {
    // SIGTERM signal received: closing HTTP server
    server.close(() => {
      // HTTP server closed
      pool.end(() => {
        // Database connections closed
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
