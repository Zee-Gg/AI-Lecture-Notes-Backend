import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { getCoursesForUser, createCourse } from '../lib/db.js';
import { deleteCourseCascade } from '../lib/deleteCascade.js';
import { verifyCourseOwnership } from '../lib/db.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courses = await getCoursesForUser(req.user!.id);
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Course name is required' });
  }

  try {
    const course = await createCourse(req.user!.id, name.trim());
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});


router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id as string ;
  if (!courseId) return res.status(400).json({ error: 'Course ID is required' });

  const owns = await verifyCourseOwnership(courseId, req.user!.id);
  if (!owns) return res.status(403).json({ error: 'Not authorized' });

  try {
    await deleteCourseCascade(courseId);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;