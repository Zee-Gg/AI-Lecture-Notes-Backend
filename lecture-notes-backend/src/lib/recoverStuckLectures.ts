import { getStuckLectures, updateLectureStatus } from './db.js';

const STUCK_THRESHOLD_MINUTES = 10;

export async function recoverStuckLectures(): Promise<void> {
  try {
    const stuck = await getStuckLectures(STUCK_THRESHOLD_MINUTES);

    for (const lecture of stuck) {
      console.warn(`Lecture ${lecture.id} stuck in processing — marking as failed`);
      await updateLectureStatus(lecture.id, 'failed');
    }
  } catch (err) {
    console.error('Error checking for stuck lectures:', err);
  }
}