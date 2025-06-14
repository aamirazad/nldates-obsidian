import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
} from "obsidian";
import type NaturalLanguageDates from "../main";
import { generateMarkdownLink } from "../utils";

interface IDateCompletion {
  label: string;
}

export default class DateSuggest extends EditorSuggest<IDateCompletion> {
  app: App;
  private plugin: NaturalLanguageDates;

  constructor(app: App, plugin: NaturalLanguageDates) {
    super(app);
    this.app = app;
    this.plugin = plugin;

    // Register Shift+Enter to select suggestion with alias
    this.scope.register(["Shift"], "Enter", (_evt: KeyboardEvent) => {
      // Get the currently selected suggestion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selectedIndex = (this as any).suggestions?.selectedItem;
      if (selectedIndex !== undefined && selectedIndex >= 0) {
        const suggestions = this.getSuggestions(this.context);
        if (suggestions[selectedIndex]) {
          // Call selectSuggestion with shift key event
          const mockEvent = new KeyboardEvent("keydown", { shiftKey: true });
          this.selectSuggestion(suggestions[selectedIndex], mockEvent);
          return false; // Prevent default behavior
        }
      }
      return true; // Allow default behavior if no suggestion selected
    });

    if (this.plugin.settings.autosuggestToggleLink) {
      this.setInstructions([
        { command: "Shift", purpose: "Keep text as alias" },
      ]);
    }
  }

  getSuggestions(context: EditorSuggestContext): IDateCompletion[] {
    const suggestions = this.getDateSuggestions(context);
    if (suggestions.length) {
      return suggestions;
    }

    // catch-all if there are no matches
    return [{ label: context.query }];
  }

  getDateSuggestions(context: EditorSuggestContext): IDateCompletion[] {
    // Time suggestions
    if (context.query.match(/^time/)) {
      return ["now", "+15 minutes", "+1 hour", "-15 minutes", "-1 hour"]
        .map((val) => ({ label: `time:${val}` }))
        .filter((item) => item.label.toLowerCase().startsWith(context.query));
    }

    // Relative suggestions like "next/last/this"
    if (context.query.match(/(next|last|this)/i)) {
      const reference = context.query.match(/(next|last|this)/i)[1];
      return [
        "week",
        "month",
        "year",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]
        .map((val) => ({ label: `${reference} ${val}` }))
        .filter((items) => items.label.toLowerCase().startsWith(context.query));
    }

    // Numeric relative dates like "in 5" or "+3"
    const relativeDate = context.query.match(/^(?:in\s+)?([+-]?\d+)/i);
    if (relativeDate) {
      const timeDelta = relativeDate[1];
      return [
        { label: `in ${timeDelta} days` },
        { label: `in ${timeDelta} weeks` },
        { label: `in ${timeDelta} months` },
        { label: `${timeDelta} days ago` },
        { label: `${timeDelta} weeks ago` },
        { label: `${timeDelta} months ago` },
      ].filter((items) => items.label.toLowerCase().startsWith(context.query));
    }

    // Basic suggestions
    return [
      { label: "today" },
      { label: "tomorrow" },
      { label: "yesterday" },
      { label: "monday" },
      { label: "tuesday" },
      { label: "wednesday" },
      { label: "thursday" },
      { label: "friday" },
      { label: "saturday" },
      { label: "sunday" },
    ].filter((items) => items.label.toLowerCase().startsWith(context.query));
  }

  renderSuggestion(suggestion: IDateCompletion, el: HTMLElement): void {
    el.setText(suggestion.label);
  }

  selectSuggestion(
    suggestion: IDateCompletion,
    event: KeyboardEvent | MouseEvent
  ): void {
    const { editor } = this.context;

    const includeAlias = event.shiftKey;
    let dateStr = "";
    let makeIntoLink = this.plugin.settings.autosuggestToggleLink;

    if (suggestion.label.startsWith("time:")) {
      const timePart = suggestion.label.substring(5);
      dateStr = this.plugin.parseTime(timePart).formattedString;
      makeIntoLink = false;
    } else {
      dateStr = this.plugin.parseDate(suggestion.label).formattedString;
    }

    if (makeIntoLink) {
      dateStr = generateMarkdownLink(
        this.app,
        dateStr,
        includeAlias ? suggestion.label : undefined
      );
    }

    editor.replaceRange(dateStr, this.context.start, this.context.end);
  }

  onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo {
    if (!this.plugin.settings.isAutosuggestEnabled) {
      return null;
    }

    const triggerPhrase = this.plugin.settings.autocompleteTriggerPhrase;
    const startPos = this.context?.start || {
      line: cursor.line,
      ch: cursor.ch - triggerPhrase.length,
    };

    if (!editor.getRange(startPos, cursor).startsWith(triggerPhrase)) {
      return null;
    }

    const precedingChar = editor.getRange(
      {
        line: startPos.line,
        ch: startPos.ch - 1,
      },
      startPos
    );

    // Short-circuit if `@` as a part of a word (e.g. part of an email address)
    if (precedingChar && /[`a-zA-Z0-9]/.test(precedingChar)) {
      return null;
    }

    return {
      start: startPos,
      end: cursor,
      query: editor.getRange(startPos, cursor).substring(triggerPhrase.length),
    };
  }
}
