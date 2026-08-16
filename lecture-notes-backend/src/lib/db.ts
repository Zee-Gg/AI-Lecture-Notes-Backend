import { supabase } from '../../middleware/supabaseClient.js';

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
  transcriptText?: string
) {
  const updates: Record<string, unknown> = { status };
  if (transcriptText !== undefined) updates.transcript_text = transcriptText;

  const { error } = await (supabase()as any)
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