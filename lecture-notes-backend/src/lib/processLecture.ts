import { downloadAudioFile } from './storage.js';
import { transcribeAudio } from './transcription.js';
import { chunkTranscript } from './chunking.js';
import { generateEmbeddings } from './embeddings.js';
import { generateStructuredNotes } from './notesGeneration.js';
import { updateLectureStatus, saveNotes, saveChunks } from './db.js';
import { jobStarted, jobFinished } from './keepAlive.js';

export async function processLecture(
  lectureId: string,
  courseId: string,
  storagePath: string,
  fileName: string
): Promise<void> {
  jobStarted();
  try {
    await updateLectureStatus(lectureId, 'processing');

    const audioBuffer = await downloadAudioFile(storagePath);
    const { fullText, segments } = await transcribeAudio(audioBuffer, fileName);

    // Structured notes generation
    const notes = await generateStructuredNotes(fullText);
    await saveNotes(lectureId, notes);

    // Chunking + embedding for cross-lecture retrieval
   const rawChunks = chunkTranscript(segments);
if (rawChunks.length > 0) {
  const embeddings = await generateEmbeddings(rawChunks.map((c) => c.content));

  const chunksWithEmbeddings = rawChunks
    .map((c, i) => {
      const embedding = embeddings[i];
      if (!embedding) return null;
      return {
        content: c.content,
        embedding,
        startTime: c.startTime,
        endTime: c.endTime,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  await saveChunks(lectureId, courseId, chunksWithEmbeddings);
}
    await updateLectureStatus(lectureId, 'done', fullText, segments);

    console.log(`Lecture ${lectureId} fully processed: transcript, notes, and ${rawChunks.length} chunks`);
  } catch (err) {
    console.error(`Processing failed for lecture ${lectureId}:`, err);
    await updateLectureStatus(lectureId, 'failed');
  } finally {
    jobFinished();
  }
}