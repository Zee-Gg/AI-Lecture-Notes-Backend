import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { getNotesForLecture, getLectureById, verifyCourseOwnership } from '../lib/db.js';

const router = Router();

function getRequiredString(value: string | string[] | undefined, fieldName: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized || normalized.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

router.get('/lecture/:lectureId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lectureId = getRequiredString(req.params.lectureId, 'lectureId');

    const lecture = await getLectureById(lectureId);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

    const owns = await verifyCourseOwnership(lecture.course_id, req.user!.id);
    if (!owns) return res.status(403).json({ error: 'Not authorized' });

    const notes = await getNotesForLecture(lectureId);
    if (!notes) return res.status(404).json({ error: 'Notes not yet available' });

    res.json(notes);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid lectureId' });
  }
});

export default router;