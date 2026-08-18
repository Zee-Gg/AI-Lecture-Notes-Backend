import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { verifyCourseOwnership } from '../lib/db.js';
import { answerQuestionForCourse } from '../lib/chat.js';

const router = Router();

router.post('/course/:courseId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.courseId as string;
  const { question } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const owns = await verifyCourseOwnership(courseId, req.user!.id);
  if (!owns) return res.status(403).json({ error: 'Not authorized for this course' });

  try {
    const result = await answerQuestionForCourse(courseId, question.trim());
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

export default router;