import { supabase } from '../../middleware/supabaseClient.js';
import type { GeneratedNotes } from './notesGeneration.js';

interface Course {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export async function getCoursesForUser(userId: string) {
  const { data, error } = await supabase()
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCourse(userId: string, name: string) {
  const courseData = { user_id: userId, name };
  const { data, error } = await (supabase() as any)
    .from('courses')
    .insert([courseData])
    .select()
    .single();

  if (error) throw error;
  return (data as Course) || null;
}

export async function getLecturesForCourse(courseId: string) {
  const { data, error } = await (supabase()as any)
    .from('lectures')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getLectureById(lectureId: string) {
  const { data, error } = await (supabase()as any)
    .from('lectures')
    .select('*')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data;
}

export async function createLecture(courseId: string, title: string, audioUrl: string) {
  const { data, error } = await (supabase()as any)
    .from('lectures')
    .insert({ course_id: courseId, title, audio_url: audioUrl, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function verifyCourseOwnership(courseId: string, userId: string) {
  const { data, error } = await (supabase()as any)
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  return true;
}

export async function updateLectureStatus(
  lectureId: string,
  status: 'pending' | 'processing' | 'done' | 'failed',
  transcriptText?: string,
  transcriptSegments?: { text: string; start: number; end: number }[]
) {
  const updates: Record<string, unknown> = { status };
  if (transcriptText !== undefined) updates.transcript_text = transcriptText;
  if (transcriptSegments !== undefined) updates.transcript_segments = transcriptSegments;

  const { error } = await (supabase() as any)
    .from('lectures')
    .update(updates)
    .eq('id', lectureId);

  if (error) throw error;
}

export async function getStuckLectures(minutesThreshold: number) {
  const cutoff = new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString();

  const { data, error } = await (supabase() as any)
    .from('lectures')
    .select('*')
    .eq('status', 'processing')
    .lt('created_at', cutoff);

  if (error) throw error;
  return data;
}

export async function saveNotes(lectureId: string, notes: GeneratedNotes) {
  const { data, error } = await (supabase() as any)
    .from('notes')
    .insert({
      lecture_id: lectureId,
      concepts: notes.concepts,
      definitions: notes.definitions,
      formulas: notes.formulas,
      emphasized_points: notes.emphasized_points,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getNotesForLecture(lectureId: string) {
  const { data, error } = await (supabase() as any)
    .from('notes')
    .select('*')
    .eq('lecture_id', lectureId)
    .maybeSingle(); // notes might not exist yet — don't throw if missing

  if (error) throw error;
  return data;
}

export async function saveChunks(
  lectureId: string,
  courseId: string,
  chunks: { content: string; embedding: number[]; startTime: number; endTime: number }[]
) {
  const rows = chunks.map((c) => ({
    lecture_id: lectureId,
    course_id: courseId,
    content: c.content,
    embedding: c.embedding,
    start_time: c.startTime,
    end_time: c.endTime,
  }));

  const { error } = await (supabase() as any)  
  .from('chunks').insert(rows);
  if (error) throw error;
}

export async function getChunkCountForLecture(lectureId: string) {
  const { count, error } = await (supabase() as any)
    .from('chunks')
    .select('*', { count: 'exact', head: true })
    .eq('lecture_id', lectureId);

  if (error) throw error;
  return count ?? 0;
}

export type MatchedChunk = {
  id: string;
  lecture_id: string;
  content: string;
  start_time: number;
  end_time: number;
  similarity: number;
};

export async function matchChunksForCourse(
  courseId: string,
  queryEmbedding: number[],
  matchCount = 6
): Promise<MatchedChunk[]> {
  const { data, error } = await (supabase() as any)
   .rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_course_id: courseId,
    match_count: matchCount,
  });

  if (error) throw error;
  return data as MatchedChunk[];
}

export async function getLectureTitlesByIds(lectureIds: string[]): Promise<Map<string, string>> {
  if (lectureIds.length === 0) return new Map();

  const { data, error } = await (supabase() as any)
    .from('lectures')
    .select('id, title')
    .in('id', lectureIds);

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data) {
    map.set(row.id, row.title);
  }
  return map;
}

export async function deleteNotesForLecture(lectureId: string) {
  const { error } = await supabase().from('notes').delete().eq('lecture_id', lectureId);
  if (error) throw error;
}

export async function deleteChunksForLecture(lectureId: string) {
  const { error } = await supabase().from('chunks').delete().eq('lecture_id', lectureId);
  if (error) throw error;
}

export async function deleteLectureRow(lectureId: string) {
  const { error } = await supabase().from('lectures').delete().eq('id', lectureId);
  if (error) throw error;
}

export async function deleteCourseRow(courseId: string) {
  const { error } = await supabase().from('courses').delete().eq('id', courseId);
  if (error) throw error;
}