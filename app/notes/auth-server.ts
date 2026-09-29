import { createActionClient } from "@/utils/supabase/actions";

export async function getAuthenticatedClient() {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}
