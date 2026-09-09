export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  systemInstruction: string;
};

// `avatar_url` is populated by OAuth providers, so keep Lithium's avatar in
// an app-owned metadata field that provider sign-ins do not replace.
export const LITHIUM_AVATAR_METADATA_KEY = 'lithium_avatar_url';

export function getUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? 'user@example.com',
    displayName: typeof metadata.display_name === 'string' ? metadata.display_name : '',
    avatarUrl: typeof metadata[LITHIUM_AVATAR_METADATA_KEY] === 'string'
      ? metadata[LITHIUM_AVATAR_METADATA_KEY]
      : typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url
        : '',
    systemInstruction: typeof metadata.system_instruction === 'string' ? metadata.system_instruction : '',
  };
}
