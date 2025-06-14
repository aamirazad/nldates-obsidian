import * as chrono from "chrono-node";
import dayjs, { Dayjs } from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";

import { DayOfWeek } from "./settings";
import { getLocaleWeekStart } from "./utils";

// Initialize dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);

export interface NLDResult {
  formattedString: string;
  date: Date;
  dayjs: Dayjs;
}

export default class NLDParser {
  constructor() {
    // Modern chrono doesn't need explicit configuration
  }

  getParsedDate(selectedText: string, weekStartPreference: DayOfWeek): Date {
    const weekStart =
      weekStartPreference === "locale-default"
        ? getLocaleWeekStart()
        : weekStartPreference;

    // Handle special "this week" and "next week" cases
    const thisWeekMatch = selectedText.match(/^this\s+week$/i);
    const nextWeekMatch = selectedText.match(/^next\s+week$/i);

    if (thisWeekMatch) {
      return chrono.parseDate(`this ${weekStart}`, new Date()) || new Date();
    }

    if (nextWeekMatch) {
      return chrono.parseDate(`next ${weekStart}`, new Date()) || new Date();
    }

    // Handle special "mid" case (e.g., "mid January" -> "January 15th")
    const midOf = selectedText.match(/^mid\s+([\w]+)$/i);
    if (midOf) {
      return chrono.parseDate(`${midOf[1]} 15th`, new Date()) || new Date();
    }

    // For everything else, let chrono handle it with current date as reference
    // This fixes the Monday issue - chrono will correctly interpret "monday" as next Monday
    return chrono.parseDate(selectedText, new Date()) || new Date();
  }
}
