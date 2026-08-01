export const parseSketchPages = (data?: string): string[] => {
  if (!data || !data.trim()) return [''];
  const trimmed = data.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(p => typeof p === 'string' ? p : '');
      }
    } catch (e) {
      // Fallback if JSON parse fails
    }
  }
  return [trimmed];
};

export const formatSketchPages = (pages: string[]): string | undefined => {
  const validPages = pages.filter(p => p && p.trim().length > 0);
  if (validPages.length === 0) return undefined;
  if (validPages.length === 1) return validPages[0];
  return JSON.stringify(validPages);
};
