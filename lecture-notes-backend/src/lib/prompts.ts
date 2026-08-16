export function buildNotesPrompt(transcript: string): string {
  return `You are an expert academic note-taker for university lectures. The lecture may mix English and Urdu (including Roman Urdu). Extract structured study notes from the transcript below.

Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:

{
  "concepts": ["short concept name", "..."],
  "definitions": [{ "term": "term name", "definition": "clear one-sentence definition" }],
  "formulas": ["formula or equation as written or described", "..."],
  "emphasized_points": ["point the teacher stressed as important or exam-relevant", "..."]
}

Rules:
- If the lecture has no formulas, return an empty array for "formulas" — do not invent any.
- "emphasized_points" should only include things the teacher explicitly flagged as important (phrases like "this is important", "yeh important hai", "remember this", "this will be in the exam").
- Translate any Urdu explanation into concise English for the notes, but keep technical terms as spoken.
- Keep each entry short and exam-oriented, not a full paragraph.

Transcript:
"""
${transcript}
"""`;
}