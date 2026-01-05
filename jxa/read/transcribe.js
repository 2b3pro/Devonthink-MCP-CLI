#!/usr/bin/env osascript -l JavaScript
// Transcribe speech, text or notes from a DEVONthink record
// Usage: osascript -l JavaScript transcribe.js '<json>'
// JSON format: {"uuid":"...","language":"en","timestamps":true}
// Required: uuid
// Optional: language (ISO code like 'en', 'de'), timestamps (boolean)
//
// Supported record types: audio, video with audio track, PDF, image
//
// Examples:
//   osascript -l JavaScript transcribe.js '{"uuid":"ABC123-DEF456"}'
//   osascript -l JavaScript transcribe.js '{"uuid":"ABC123","language":"en"}'
//   osascript -l JavaScript transcribe.js '{"uuid":"ABC123","language":"de","timestamps":true}'

ObjC.import("Foundation");

function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count <= index) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(index));
  return arg && arg.length > 0 ? arg : defaultValue;
}

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({
    success: false,
    error: 'Usage: transcribe.js \'{"uuid":"..."}\''
  });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const { uuid, language, timestamps } = params;

    if (!uuid) throw new Error("Missing required field: uuid");

    const app = Application("DEVONthink");
    const record = app.getRecordWithUuid(uuid);

    if (!record) throw new Error("Record not found: " + uuid);

    // Build transcription options
    const transcribeOptions = { record: record };

    if (language && language.length > 0) {
      transcribeOptions.language = language;
    }

    if (timestamps !== undefined) {
      transcribeOptions.timestamps = timestamps === true;
    }

    // Perform transcription
    const transcription = app.transcribe(transcribeOptions);

    if (!transcription) {
      JSON.stringify({
        success: false,
        uuid: uuid,
        name: record.name(),
        error: "Transcription failed or returned no content"
      }, null, 2);
    } else {
      JSON.stringify({
        success: true,
        uuid: uuid,
        name: record.name(),
        recordType: record.recordType(),
        language: language || "default",
        timestamps: timestamps !== undefined ? timestamps : "default",
        transcription: transcription
      }, null, 2);
    }

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
