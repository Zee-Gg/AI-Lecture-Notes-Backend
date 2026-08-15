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