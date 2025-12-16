import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import shiftRoutes from './routes/shift.routes';
import statsRoutes from './routes/stats.routes';
import holidayRoutes from './routes/holiday.routes';
import rateRoutes from './routes/rate.routes';
import printRoutes from './routes/print.routes';

// Import error handler
import errorHandler from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/print', printRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Health: http://localhost:${PORT}/api/health`);
});

export default app;
