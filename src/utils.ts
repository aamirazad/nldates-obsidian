import { Dayjs } from "dayjs";
import {
  App,
  Editor,
  EditorRange,
  EditorPosition,
  normalizePath,
  TFile,
} from "obsidian";
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";
import dayjs from "dayjs";

import { DayOfWeek } from "./settings";

const daysOfWeek: Omit<DayOfWeek, "locale-default">[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export default function getWordBoundaries(editor: Editor): EditorRange {
  const cursor = editor.getCursor();
  const currentLine = editor.getLine(cursor.line);
  const currentChar = cursor.ch;

  // Find word boundaries manually
  let wordStart = currentChar;
  let wordEnd = currentChar;

  // Find start of word
  while (wordStart > 0 && /\S/.test(currentLine[wordStart - 1])) {
    wordStart--;
  }

  // Find end of word
  while (wordEnd < currentLine.length && /\S/.test(currentLine[wordEnd])) {
    wordEnd++;
  }

  return {
    from: { line: cursor.line, ch: wordStart },
    to: { line: cursor.line, ch: wordEnd },
  };
}

export function getSelectedText(editor: Editor): string {
  if (editor.somethingSelected()) {
    return editor.getSelection();
  } else {
    const wordBoundaries = getWordBoundaries(editor);
    editor.setSelection(wordBoundaries.from, wordBoundaries.to);
    return editor.getSelection();
  }
}

export function adjustCursor(
  editor: Editor,
  cursor: EditorPosition,
  newStr: string,
  oldStr: string
): void {
  const cursorOffset = newStr.length - oldStr.length;
  editor.setCursor({
    line: cursor.line,
    ch: cursor.ch + cursorOffset,
  });
}

export function getFormattedDate(date: Date, format: string): string {
  return dayjs(date).format(format);
}

export function parseTruthy(flag: string): boolean {
  return ["y", "yes", "1", "t", "true"].indexOf(flag.toLowerCase()) >= 0;
}

export function getLocaleWeekStart(): Omit<DayOfWeek, "locale-default"> {
  // Use dayjs to get locale week start, fallback to Sunday if not available
  try {
    const localeData = dayjs.localeData();
    const startOfWeek = (localeData as any)._config?.week?.dow ?? 0;
    return daysOfWeek[startOfWeek];
  } catch {
    return "sunday"; // fallback
  }
}

export function generateMarkdownLink(
  app: App,
  subpath: string,
  alias?: string
) {
  const useMarkdownLinks = (app.vault as any).getConfig("useMarkdownLinks");
  const path = normalizePath(subpath);

  if (useMarkdownLinks) {
    if (alias) {
      return `[${alias}](${path.replace(/ /g, "%20")})`;
    } else {
      return `[${subpath}](${path})`;
    }
  } else {
    if (alias) {
      return `[[${path}|${alias}]]`;
    } else {
      return `[[${path}]]`;
    }
  }
}

export async function getOrCreateDailyNote(date: Dayjs): Promise<TFile | null> {
  // Convert dayjs to moment for compatibility with obsidian-daily-notes-interface
  const momentDate = (window as any).moment(date.toDate());
  const desiredNote = getDailyNote(momentDate, getAllDailyNotes());
  if (desiredNote) {
    return Promise.resolve(desiredNote);
  }
  return createDailyNote(momentDate);
}
