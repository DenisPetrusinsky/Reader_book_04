import { supabase } from './supabase';

export const gamificationService = {
    // Get student progress and stats
  async getStudentProgress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user profile with stats
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.log('Profile not found, creating default profile');
        // If profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
            points: 0,
            diamonds: 0,
            current_streak: 0,
            longest_streak: 0,
            level: 1
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Failed to create profile:', createError);
          // Return default values if profile creation fails
          return {
            points: 0,
            diamonds: 0,
            currentStreak: 0,
            longestStreak: 0,
            level: 1,
            totalRecordings: 0,
            thisWeekRecordings: 0,
            nextLevelPoints: 100,
          };
        }
        
        // Use the newly created profile
        const profileData = newProfile;
        
        // Get total recordings count
        const { count: totalRecordings } = await supabase
          .from('audio_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get this week recordings
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const { count: thisWeekRecordings } = await supabase
          .from('audio_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekStart.toISOString());

        // Calculate next level points needed
        const currentLevel = profileData.level || 1;
        const nextLevelPoints = currentLevel * 100;
        const pointsToNext = nextLevelPoints - (profileData.points || 0);

        return {
          points: profileData.points || 0,
          diamonds: profileData.diamonds || 0,
          currentStreak: profileData.current_streak || 0,
          longestStreak: profileData.longest_streak || 0,
          level: profileData.level || 1,
          totalRecordings: totalRecordings || 0,
          thisWeekRecordings: thisWeekRecordings || 0,
          nextLevelPoints: Math.max(0, pointsToNext),
        };
      }

      // Get total recordings count
      const { count: totalRecordings } = await supabase
        .from('audio_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get this week recordings
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { count: thisWeekRecordings } = await supabase
        .from('audio_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString());

      // Calculate next level points needed
      const currentLevel = profile.level || 1;
      const nextLevelPoints = currentLevel * 100;
      const currentLevelMin = (currentLevel - 1) * 100;
      const pointsToNext = nextLevelPoints - (profile.points || 0);

      return {
        points: profile.points || 0,
        diamonds: profile.diamonds || 0,
        currentStreak: profile.current_streak || 0,
        longestStreak: profile.longest_streak || 0,
        level: profile.level || 1,
        totalRecordings: totalRecordings || 0,
        thisWeekRecordings: thisWeekRecordings || 0,
        nextLevelPoints: Math.max(0, pointsToNext),
      };
    } catch (error) {
      console.error('❌ Get student progress error:', error);
      throw error;
    }
  },

  // Get recent achievements
  async getRecentAchievements(limit: number = 5) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(ua => ({
        ...ua.achievements,
        earned_at: ua.earned_at
      })) || [];
    } catch (error) {
      console.error('❌ Get recent achievements error:', error);
      throw error;
    }
  },

  // Get all achievements with progress
  async getAllAchievements() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Get user's earned achievements
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);

      if (userError) throw userError;

      const earnedMap = new Map();
      userAchievements?.forEach(ua => {
        earnedMap.set(ua.achievement_id, ua.earned_at);
      });

      return achievements?.map(achievement => ({
        ...achievement,
        earned: earnedMap.has(achievement.id),
        earned_at: earnedMap.get(achievement.id)
      })) || [];
    } catch (error) {
      console.error('❌ Get all achievements error:', error);
      throw error;
    }
  },

    // Award points and check for new achievements
  async awardPoints(points: number, recordingId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current profile
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('points, level')
        .eq('user_id', user.id)
        .single();

      if (selectError) {
        console.error('Profile not found for points award:', selectError);
        return { newPoints: points, newLevel: 1 };
      }

      const newPoints = (profile.points || 0) + points;
      const newLevel = Math.floor(newPoints / 100) + 1;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          points: newPoints,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update points:', updateError);
        return { newPoints, newLevel };
      }

      // Check for new achievements
      await this.checkAndAwardAchievements();

      return { newPoints, newLevel };
    } catch (error) {
      console.error('❌ Award points error:', error);
      throw error;
    }
  },

    // Update reading streak
  async updateStreak() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];
      
      // Check if already recorded today
      const { data: existingStreak } = await supabase
        .from('reading_streaks')
        .select('*')
        .eq('student_id', user.id)
        .eq('streak_date', today)
        .single();

      if (existingStreak) {
        // Update existing record
        await supabase
          .from('reading_streaks')
          .update({
            recordings_count: existingStreak.recordings_count + 1,
            points_earned: existingStreak.points_earned + 10
          })
          .eq('id', existingStreak.id);
      } else {
        // Create new streak record
        const { error: streakError } = await supabase
          .from('reading_streaks')
          .insert({
            student_id: user.id,
            streak_date: today,
            recordings_count: 1,
            points_earned: 10
          });

        if (streakError) {
          console.error('Failed to create streak record:', streakError);
          return;
        }

        // Update user streak
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_streak, longest_streak')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          const newCurrentStreak = (profile.current_streak || 0) + 1;
          const newLongestStreak = Math.max(
            profile.longest_streak || 0, 
            newCurrentStreak
          );

          await supabase
            .from('profiles')
            .update({
              current_streak: newCurrentStreak,
              longest_streak: newLongestStreak,
              last_activity: today
            })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('❌ Update streak error:', error);
      throw error;
    }
  },

  // Check and award achievements
  async checkAndAwardAchievements() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user stats
      const stats = await this.getStudentProgress();
      
      // Get all achievements user hasn't earned
      const { data: availableAchievements, error } = await supabase
        .from('achievements')
        .select('*')
        .not('id', 'in', `(
          SELECT achievement_id 
          FROM user_achievements 
          WHERE user_id = '${user.id}'
        )`);

      if (error) throw error;

      const newAchievements = [];

      for (const achievement of availableAchievements || []) {
        let earned = false;
        
        switch (achievement.requirement_type) {
          case 'total_recordings':
            earned = stats.totalRecordings >= achievement.requirement_value;
            break;
          case 'streak':
            earned = stats.currentStreak >= achievement.requirement_value;
            break;
          case 'points':
            earned = stats.points >= achievement.requirement_value;
            break;
          case 'perfect_week':
            // Check if user has recorded every day for a week
            // This would need more complex logic
            break;
        }

        if (earned) {
          // Award achievement
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id
            });

          // Award points and diamonds
          if (achievement.points_reward > 0 || achievement.diamonds_reward > 0) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('points, diamonds')
              .eq('id', user.id)
              .single();

            await supabase
              .from('profiles')
              .update({
                points: (profile?.points || 0) + achievement.points_reward,
                diamonds: (profile?.diamonds || 0) + achievement.diamonds_reward
              })
              .eq('id', user.id);
          }

          newAchievements.push(achievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('❌ Check achievements error:', error);
      throw error;
    }
  },

  // Parent functions
  async getStudentsByParent() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: students, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', user.id);

      if (error) throw error;

      // Get stats for each student
      const studentsWithStats = await Promise.all(
        (students || []).map(async (student) => {
          const { count: totalRecordings } = await supabase
            .from('audio_records')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', student.id);

          const { count: pendingAssignments } = await supabase
            .from('reading_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.id)
            .eq('status', 'pending');

          const today = new Date().toISOString().split('T')[0];
          const { count: todayRecordings } = await supabase
            .from('audio_records')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', student.id)
            .gte('created_at', today);

          return {
            ...student,
            totalRecordings: totalRecordings || 0,
            pendingAssignments: pendingAssignments || 0,
            completedToday: (todayRecordings || 0) > 0
          };
        })
      );

      return studentsWithStats;
    } catch (error) {
      console.error('❌ Get students by parent error:', error);
      throw error;
    }
  },

  async getRecentActivity() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get recent recordings from students
      const { data: recentRecordings, error } = await supabase
        .from('audio_records')
        .select(`
          *,
          profiles!inner(parent_id, full_name)
        `)
        .eq('profiles.parent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return recentRecordings?.map(recording => ({
        type: 'recording',
        title: `${recording.profiles.full_name} completed "${recording.title}"`,
        time: new Date(recording.created_at).toLocaleDateString()
      })) || [];
    } catch (error) {
      console.error('❌ Get recent activity error:', error);
      throw error;
    }
  }
};