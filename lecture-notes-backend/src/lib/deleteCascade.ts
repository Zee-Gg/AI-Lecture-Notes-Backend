import {
  getLectureById,
  getLecturesForCourse,
  deleteNotesForLecture,
  deleteChunksForLecture,
  deleteLectureRow,
  deleteCourseRow,
} from './db.js';
import { deleteAudioFile } from './storage.js';

export async function deleteLectureCascade(lectureId: string): Promise<void> {
  const lecture = await getLectureById(lectureId);
  if (!lecture) return; // already gone, nothing to do

  // Order matters: clean up dependents before the parent row
  await deleteNotesForLecture(lectureId);
  await deleteChunksForLecture(lectureId);

  if (lecture.audio_url) {
    try {
      await deleteAudioFile(lecture.audio_url);
    } catch (err) {
      // Don't let a storage cleanup failure block the DB delete —
      // log it, but the student's intent ("delete this lecture") should still succeed
      console.error(`Failed to delete audio file for lecture ${lectureId}:`, err);
    }
  }

  await deleteLectureRow(lectureId);
}

export async function deleteCourseCascade(courseId: string): Promise<void> {
  const lectures = await getLecturesForCourse(courseId);

  for (const lecture of lectures) {
    await deleteLectureCascade(lecture.id);
  }

  await deleteCourseRow(courseId);
}