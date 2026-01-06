import express from 'express';
import cors from 'cors';
import parentRouter from './routes/parent.route.js';
import errorHandler from './middlewares/error.js';
import teacherRouter from './routes/teacher.route.js';
import adminRouter from './routes/admin.route.js';
import authRouter from './routes/auth.route.js';
import statRouter from './routes/stat.route.js';
import { stripeWebhook } from './config/stripeWebhook.js';
import { Login } from './controllers/auth.controller.js';
import { validate } from './middlewares/validate.js';
import { AdminLoginSchema } from './schemas/admin.schema.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);


app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);


app.use(express.json());


app.use("/stats",statRouter)
app.use('/auth', authRouter);
app.use('/parent', parentRouter);
app.use('/teacher', teacherRouter);
app.use('/admin', adminRouter);

app.use(errorHandler);

export default app;
