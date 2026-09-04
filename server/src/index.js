require('dotenv').config();

const express = require('express');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth.routes');
const classRoutes = require('./routes/class.routes');
const sessionRoutes = require('./routes/session.routes');
const bookingRoutes = require('./routes/booking.routes');
const memberAlertRoutes = require('./routes/member-alert.routes');
const memberRoutes = require('./routes/member.routes');
const instructorRoutes = require('./routes/instructor.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Core middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

// ── Routes ───────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/classes', classRoutes);
app.use('/sessions', sessionRoutes);
app.use('/bookings', bookingRoutes);
app.use('/membership-alerts', memberAlertRoutes);
app.use('/members', memberRoutes);
app.use('/instructor', instructorRoutes);
app.use('/dashboard', dashboardRoutes);


// ── Error handling ───────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
