#!/usr/bin/env osascript -l JavaScript
// Convert a DEVONthink record to another format
// Usage: osascript -l JavaScript convertRecord.js '<json>'
// JSON format: {"uuid":"...","to":"...","destGroupUuid":"..."}
//
// Dependencies (injected by runner):
// - getArg, extractUuid, resolveGroup

// Map user-friendly format names to DEVONthink convert types
function getConvertType(format) {
  const mapping = {
    "simple": "simple",
    "plain": "simple",
    "text": "simple",
    "rich": "rich",
    "rtf": "rich",
    "note": "note",
    "formatted": "note",
    "html": "HTML",
    "markdown": "markdown",
    "md": "markdown",
    "pdf": "PDF document",
    "pdf-annotated": "PDF with annotations burnt in",
    "pdf-no-annotations": "PDF without annotations",
    "pdf-single": "single page PDF document",
    "webarchive": "webarchive",
    "bookmark": "bookmark"
  };

  const key = format.toLowerCase();
  if (!mapping[key]) {
    throw new Error("Unknown format: " + format + ". Valid: simple, rich, note, html, markdown, pdf, pdf-annotated, pdf-no-annotations, pdf-single, webarchive, bookmark");
  }
  return mapping[key];
}

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({
    success: false,
    error: 'Usage: convertRecord.js \'{\"uuid\":\"...\",\"to\":\"markdown\"}\''
  });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const { uuid, to, destGroupUuid } = params;

    if (!uuid) throw new Error("Missing required field: uuid");

    const app = Application("DEVONthink");
    const record = app.getRecordWithUuid(extractUuid(uuid));

    if (!record) throw new Error("Record not found: " + uuid);

    // Build convert options
    const convertOptions = {
      record: record
    };

    // Set format (default: simple/plain text)
    if (to && to.length > 0) {
      convertOptions.to = getConvertType(to);
    }

    // Set destination group if specified
    if (destGroupUuid && destGroupUuid.length > 0) {
      const recordDb = record.database();
      const destGroup = resolveGroup(app, destGroupUuid, recordDb);
      if (destGroup) {
        convertOptions.in = destGroup;
      }
    }

    // Perform conversion
    const converted = app.convert(convertOptions);

    if (!converted) {
      throw new Error("Conversion failed");
    }

    JSON.stringify({
      success: true,
      originalUuid: uuid,
      originalName: record.name(),
      convertedUuid: converted.uuid(),
      convertedName: converted.name(),
      convertedType: converted.recordType(),
      convertedLocation: converted.location(),
      format: to || "simple"
    }, null, 2);

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}