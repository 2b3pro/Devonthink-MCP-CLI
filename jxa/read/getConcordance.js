#!/usr/bin/env osascript -l JavaScript
// Get concordance (word list) of a DEVONthink record
// Usage: osascript -l JavaScript getConcordance.js <uuid> [sortBy]
// sortBy: weight (default), count, name
//
// Examples:
//   osascript -l JavaScript getConcordance.js "ABC123-DEF456"
//   osascript -l JavaScript getConcordance.js "ABC123-DEF456" "count"
//   osascript -l JavaScript getConcordance.js "ABC123-DEF456" "name"

ObjC.import("Foundation");

function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count <= index) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(index));
  return arg && arg.length > 0 ? arg : defaultValue;
}

const uuid = getArg(4, null);
const sortBy = getArg(5, "weight");

if (!uuid) {
  JSON.stringify({
    success: false,
    error: "Usage: getConcordance.js <uuid> [sortBy]"
  });
} else {
  try {
    const app = Application("DEVONthink");
    const record = app.getRecordWithUuid(uuid);

    if (!record) throw new Error("Record not found: " + uuid);

    // Map sort option to DEVONthink concordance sorting
    let sortOption;
    switch (sortBy.toLowerCase()) {
      case "count":
        sortOption = "count";
        break;
      case "name":
      case "alphabetical":
        sortOption = "name";
        break;
      case "weight":
      default:
        sortOption = "weight";
        break;
    }

    // Get concordance with sorting
    const words = app.getConcordanceOf(record, { sortedBy: sortOption });

    if (!words || words.length === 0) {
      JSON.stringify({
        success: true,
        uuid: uuid,
        name: record.name(),
        sortedBy: sortOption,
        wordCount: 0,
        words: []
      }, null, 2);
    } else {
      JSON.stringify({
        success: true,
        uuid: uuid,
        name: record.name(),
        sortedBy: sortOption,
        wordCount: words.length,
        words: words
      }, null, 2);
    }

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
