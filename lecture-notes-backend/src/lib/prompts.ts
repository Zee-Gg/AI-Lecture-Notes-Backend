export function buildNotesPrompt(transcript: string): string {
  return `You are an expert academic note-taker for university lectures. Extract structured study notes from the transcript below.

Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:

{
  "concepts": ["short concept name", "..."],
  "definitions": [{ "term": "term name", "definition": "clear one-sentence definition" }],
  "formulas": ["formula or equation as written or described", "..."],
  "emphasized_points": ["point the teacher stressed as important or exam-relevant", "..."]
}

Rules:
- If the lecture has no formulas, return an empty array for "formulas" — do not invent any.
- "emphasized_points" should only include things the teacher explicitly flagged as important (phrases like "this is important", "remember this", "this will be in the exam").
- Keep each entry short and exam-oriented, not a full paragraph.

Transcript:
"""
${transcript}
"""`;
}

type ContextChunk = {
  lectureTitle: string;
  startTime: number;
  content: string;
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function buildChatPrompt(question: string, contextChunks: ContextChunk[]): string {
  const context = contextChunks
    .map(
      (c, i) =>
        `[Source ${i + 1} — "${c.lectureTitle}" at ${formatTimestamp(c.startTime)}]\n${c.content}`
    )
    .join('\n\n');

  return `You are a study assistant answering a student's question using only the lecture excerpts provided below. The lectures may mix English and Urdu.

Rules:
- Answer using ONLY the information in the excerpts. If the excerpts don't contain the answer, say so clearly — do not make up information.
- When you use information from a source, cite it inline like [Source 1], [Source 2], etc., matching the numbers below.
- Keep the answer clear and exam-focused, not overly long.

Lecture excerpts:
${context}

Student's question: ${question}

Answer:`;
}