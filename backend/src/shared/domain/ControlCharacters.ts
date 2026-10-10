/** True when the text has any C0 control character (U+0000-U+001F) or DEL (U+007F). */
export function hasControlCharacters(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export const CONTROL_CHARACTERS_MESSAGE = 'must not contain control characters';
