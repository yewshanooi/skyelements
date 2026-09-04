'use server';

import { redirect } from 'next/navigation';
import { getAuthenticatedClient, getUserProfile, LITHIUM_AVATAR_METADATA_KEY, type UserProfile } from './profile';

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_SYSTEM_INSTRUCTION_LENGTH = 4000;
const USER_STORAGE_BUCKETS = ['avatars', 'chat-uploads', 'chat-images', 'invoices'] as const;

type StorageEntry = {
  name: string;
  id: string | null;
};

async function listStoragePaths(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
    });

    if (error) throw error;
    const entries = (data ?? []) as StorageEntry[];
    if (entries.length === 0) break;

    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) {
        paths.push(path);
      } else {
        paths.push(...await listStoragePaths(supabase, bucket, path));
      }
    }

    if (entries.length < 1000) break;
    offset += entries.length;
  }

  return paths;
}

async function deleteUserStorage(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  userId: string,
) {
  for (const bucket of USER_STORAGE_BUCKETS) {
    const paths = await listStoragePaths(supabase, bucket, userId);
    for (let index = 0; index < paths.length; index += 1000) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 1000));
      if (error) throw error;
    }
  }
}

export async function updateProfile(input: {
  displayName: string;
  avatarUrl?: string;
  systemInstruction: string;
}): Promise<UserProfile> {
  const { supabase, user } = await getAuthenticatedClient();
  const displayName = input.displayName.trim();
  const systemInstruction = input.systemInstruction.trim();
  const avatarUrl = input.avatarUrl?.trim() ?? '';

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
  }

  if (systemInstruction.length > MAX_SYSTEM_INSTRUCTION_LENGTH) {
    throw new Error(`Custom instructions must be ${MAX_SYSTEM_INSTRUCTION_LENGTH} characters or fewer.`);
  }

  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      display_name: displayName,
      [LITHIUM_AVATAR_METADATA_KEY]: avatarUrl,
      system_instruction: systemInstruction,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Failed to update your profile.');
  }

  return getUserProfile(data.user);
}

export async function deleteAccount(): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  try {
    await deleteUserStorage(supabase, user.id);
  } catch (error) {
    console.error('[profile-actions] delete account storage error:', error);
    throw new Error(`Failed to delete your account files: ${error instanceof Error ? error.message : 'Storage cleanup failed.'}`);
  }

  const { error } = await supabase.rpc('delete_current_user');

  if (error) {
    console.error('[profile-actions] delete account error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to permanently delete your account: ${error.message}`);
  }

  await supabase.auth.signOut();
  redirect('/');
}
