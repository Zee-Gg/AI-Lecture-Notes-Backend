import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
dotenv.config();

import { requireAuth } from './middleware/auth.js';
import type { AuthenticatedRequest } from './middleware/auth.js';
import coursesRouter from './src/routes/courses.js';
import lecturesRouter from './src/routes/lectures.js';
import { recoverStuckLectures } from './src/lib/recoverStuckLectures.js';
import notesRouter from './src/routes/notes.js';
import chatRouter from './src/routes/chat.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/courses', coursesRouter);
app.use('/api/lectures', lecturesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is alive' });
});

app.get('/api/protected-test', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: `Hello ${req.user?.email}, you are authenticated!` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

recoverStuckLectures(); // check on startup
setInterval(recoverStuckLectures, 5 * 60 * 1000); // and every 5 minutes while running