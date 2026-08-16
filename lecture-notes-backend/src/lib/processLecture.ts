import { downloadAudioFile } from './storage.js';
import { transcribeAudio } from './transcription.js';
import { generateStructuredNotes } from './notesGeneration.js';
import { updateLectureStatus, saveNotes } from './db.js';
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

    // Generate structured notes before marking as done —
    // "done" should mean "fully ready to study from," not just "transcribed"
    const notes = await generateStructuredNotes(transcript);
    await saveNotes(lectureId, notes);

    await updateLectureStatus(lectureId, 'done', transcript);

    console.log(`Lecture ${lectureId} transcribed and notes generated`);
  } catch (err) {
    console.error(`Processing failed for lecture ${lectureId}:`, err);
    await updateLectureStatus(lectureId, 'failed');
  } finally {
    jobFinished();
  }
}