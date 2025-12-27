import express from 'express';
import cors from 'cors';
import parentRouter from './routes/parent.route.js';
import errorHandler from './middlewares/error.js';
import teacherRouter from './routes/teacher.route.js';
import { stripeWebhook } from './config/stripeWebhook.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use('/parent', parentRouter);
app.use('/teacher', teacherRouter);

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(errorHandler);

export default app;
