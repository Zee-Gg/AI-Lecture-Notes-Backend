import { generateQueryEmbedding } from './embeddings.js';
import { matchChunksForCourse, getLectureTitlesByIds } from './db.js';
import { buildChatPrompt } from './prompts.js';
import Groq from 'groq-sdk';
import { GROQ_CHAT_MODEL } from '../lib/modelConfig.js';

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  }
  return groqClient;
}

export type ChatCitation = {
  lectureId: string;
  lectureTitle: string;
  startTime: number;
  endTime: number;
};

export type ChatResponse = {
  answer: string;
  citations: ChatCitation[];
};

export async function answerQuestionForCourse(
  courseId: string,
  question: string
): Promise<ChatResponse> {
  const queryEmbedding = await generateQueryEmbedding(question);
  const matches = await matchChunksForCourse(courseId, queryEmbedding, 6);

  if (matches.length === 0) {
    return {
      answer:
        "I couldn't find anything relevant in this course's lectures yet. Try uploading more lectures, or rephrase your question.",
      citations: [],
    };
  }

  const lectureIds = [...new Set(matches.map((m) => m.lecture_id))];
  const titleMap = await getLectureTitlesByIds(lectureIds);

  const contextChunks = matches.map((m) => ({
    lectureTitle: titleMap.get(m.lecture_id) || 'Unknown lecture',
    startTime: m.start_time,
    content: m.content,
  }));

  const prompt = buildChatPrompt(question, contextChunks);
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: GROQ_CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const answer = completion.choices[0]?.message?.content || 'No answer generated.';

  const citations: ChatCitation[] = matches.map((m) => ({
    lectureId: m.lecture_id,
    lectureTitle: titleMap.get(m.lecture_id) || 'Unknown lecture',
    startTime: m.start_time,
    endTime: m.end_time,
  }));

  return { answer, citations };
}