import { Router } from 'express';
import type { Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getLecturesForCourse,
  getLectureById,
  createLecture,
  verifyCourseOwnership,
} from '../lib/db.js';
import { uploadAudioFile, getSignedAudioUrl } from '../lib/storage.js';
import { processLecture } from '../lib/processLecture.js';


const router = Router();

function getRequiredString(value: string | string[] | undefined, fieldName: string): string {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized || normalized.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 45 * 1024 * 1024 }, // 45MB cap
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format'));
    }
  },
});

// GET all lectures for a course
router.get('/course/:courseId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courseId = getRequiredString(req.params.courseId, 'courseId');

    const owns = await verifyCourseOwnership(courseId, req.user!.id);
    if (!owns) return res.status(403).json({ error: 'Not authorized for this course' });

    const lectures = await getLecturesForCourse(courseId);
    res.json(lectures);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid courseId' });
  }
});

// GET single lecture
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lectureId = getRequiredString(req.params.id, 'lectureId');
    const lecture = await getLectureById(lectureId);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

    const owns = await verifyCourseOwnership(lecture.course_id, req.user!.id);
    if (!owns) return res.status(403).json({ error: 'Not authorized' });

    res.json(lecture);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid lectureId' });
  }
});

// GET signed audio URL for playback
router.get('/:id/audio-url', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lectureId = getRequiredString(req.params.id, 'lectureId');
    const lecture = await getLectureById(lectureId);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

    const owns = await verifyCourseOwnership(lecture.course_id, req.user!.id);
    if (!owns) return res.status(403).json({ error: 'Not authorized' });

    const signedUrl = await getSignedAudioUrl(lecture.audio_url);
    res.json({ url: signedUrl });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid lectureId' });
  }
});

// POST upload a lecture
router.post(
  '/course/:courseId',
  requireAuth,
  upload.single('audio'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const courseId = getRequiredString(req.params.courseId, 'courseId');
      const title = getRequiredString(req.body.title, 'title');
      
      if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const storagePath = await uploadAudioFile(
        courseId,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );
      const lecture = await createLecture(courseId, title.trim(), storagePath);

      // Fire-and-forget: don't await, let it run in the background
      processLecture(lecture.id, storagePath, req.file.originalname).catch((err) =>
        console.error('Background processing error:', err)
      );

      res.status(201).json(lecture);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload lecture' });
    }
  }
);

export default router;