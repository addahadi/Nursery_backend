import express from 'express';
import cors from 'cors';
import parentRouter from './routes/parent.route.js';
import errorHandler from './middlewares/error.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use('/parent', parentRouter);
app.use(errorHandler);

export default app;
