import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isProduction(): boolean {
  return import.meta.env.VITE_APP_ENV === "production";
}

export function sanitizeString(input: string, maxLength = 500): string {
  // 1. Trim and limit length to prevent excessive token usage
  let sanitized = input.trim().slice(0, maxLength);

  // 2. Remove control characters that could cause issues
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  // 3. Remove potentially dangerous characters for prompt injection
  // and JSON injection attacks
  sanitized = sanitized.replace(/[<>'"`;{}[\]\\]/g, "");

  // 4. Normalize whitespace (collapse multiple spaces into one)
  sanitized = sanitized.replace(/\s+/g, " ");

  // 5. Remove any remaining special Unicode characters that might cause issues
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return sanitized.trim();
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // Bold **text**
    .replace(/\*(.+?)\*/g, "$1") // Italic *text*
    .replace(/__(.+?)__/g, "$1") // Bold __text__
    .replace(/_(.+?)_/g, "$1") // Italic _text_
    .replace(/`{1,3}(.+?)`{1,3}/g, "$1") // Code `text` or ```text```
    .replace(/^#{1,6}\s+/gm, "") // Headers # text
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Links [text](url)
    .trim();
}
