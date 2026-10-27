import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Profile } from '@/types/db';

export const profileKey = ['profile'] as const;
export function useProfile() {
  const userId = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles')
        .select('*').eq('id', userId!).maybeSingle();
      if (error) throw new Error(error.message);
      return data as Profile | null;
    },
    enabled: !!userId,
  });
}

export type ProfilePatch = Partial<Pick<Profile,
  'name' | 'age' | 'gender' | 'height_cm' | 'activity_level' | 'is_demo'>>;

export function useUpdateProfile() {
  const qc = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      // DECISION: приведение к Partial<Profile> нужно из-за nullable-полей в профиле.
      const { data, error } = await supabase.from('profiles')
        .update(patch as Partial<Profile>).eq('id', userId!).select().single();
      if (error) throw new Error(error.message);
      return data as unknown as Profile;
    },
    onSuccess: (row) => qc.setQueryData(profileKey, row),
  });
}
