export const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  // Images
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],

  // Documents
  'application/pdf': ['.pdf'],
  
  // Text/Code
  'text/plain': ['.txt', '.md', '.csv', '.log'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'text/javascript': ['.js', '.mjs'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'text/x-python': ['.py'],
  'text/x-java': ['.java'],
  'text/x-c': ['.c', '.h'],
  'text/x-c++': ['.cpp', '.hpp', '.cc'],
  'text/x-typescript': ['.ts', '.tsx'],
};

export const SUPPORTED_MIME_TYPES = Object.keys(SUPPORTED_FILE_TYPES);
export const SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES).flat();

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
