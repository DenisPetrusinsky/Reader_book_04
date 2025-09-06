import { supabase } from './supabase';

export const assignmentService = {
  // Get student assignments
  async getStudentAssignments(filter: 'all' | 'pending' | 'completed' = 'all') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('reading_assignments')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filter === 'completed') {
        query = query.in('status', ['completed', 'reviewed']);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Get student assignments error:', error);
      throw error;
    }
  },

  // Create assignment (parent function)
  async createAssignment(assignmentData: {
    student_id: string;
    title: string;
    description?: string;
    book_title: string;
    target_duration?: number;
    points_reward?: number;
    due_date?: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reading_assignments')
        .insert({
          ...assignmentData,
          parent_id: user.id,
          points_reward: assignmentData.points_reward || 10
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Create assignment error:', error);
      throw error;
    }
  },

  // Complete assignment
  async completeAssignment(assignmentId: string, recordingId: string) {
    try {
      const { data, error } = await supabase
        .from('reading_assignments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      // Link recording to assignment
      await supabase
        .from('audio_records')
        .update({ assignment_id: assignmentId })
        .eq('id', recordingId);

      return data;
    } catch (error) {
      console.error('❌ Complete assignment error:', error);
      throw error;
    }
  },

  // Parent review assignment
  async reviewAssignment(assignmentId: string, rating: number, feedback?: string, quality?: string) {
    try {
      const { data, error } = await supabase
        .from('reading_assignments')
        .update({ 
          status: 'reviewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      // Update associated recording
      const { data: recording } = await supabase
        .from('audio_records')
        .select('id')
        .eq('assignment_id', assignmentId)
        .single();

      if (recording) {
        await supabase
          .from('audio_records')
          .update({
            parent_rating: rating,
            parent_feedback: feedback,
            reading_quality: quality
          })
          .eq('id', recording.id);
      }

      return data;
    } catch (error) {
      console.error('❌ Review assignment error:', error);
      throw error;
    }
  }
};