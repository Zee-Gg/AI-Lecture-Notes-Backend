import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { requireAuth } from './middleware/auth.js';
import type { AuthenticatedRequest } from './middleware/auth.js';
import coursesRouter from './src/routes/courses.js';
import lecturesRouter from './src/routes/lectures.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/courses', coursesRouter);
app.use('/api/lectures', lecturesRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is alive' });
});

app.get('/api/protected-test', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: `Hello ${req.user?.email}, you are authenticated!` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));