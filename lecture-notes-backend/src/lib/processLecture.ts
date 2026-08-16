import { downloadAudioFile } from './storage.js';
import { transcribeAudio } from './transcription.js';
import { updateLectureStatus } from './db.js';
import { jobStarted, jobFinished } from './keepAlive.js';

export async function processLecture(
  lectureId: string,
  storagePath: string,
  fileName: string
): Promise<void> {
  jobStarted();
  try {
    await updateLectureStatus(lectureId, 'processing');

    const audioBuffer = await downloadAudioFile(storagePath);
    const transcript = await transcribeAudio(audioBuffer, fileName);

    await updateLectureStatus(lectureId, 'done', transcript);

    console.log(`Lecture ${lectureId} transcribed successfully`);
  } catch (err) {
    console.error(`Transcription failed for lecture ${lectureId}:`, err);
    await updateLectureStatus(lectureId, 'failed');
  } finally {
    jobFinished();
  }
}