#!/usr/bin/env osascript -l JavaScript
// Get filesystem or database path of a DEVONthink record
// Usage: osascript -l JavaScript getRecordPath.js <uuid> <type>
// type: "filepath" for POSIX path, "dbpath" for database location

ObjC.import("Foundation");

const uuidArg = getArg(4, null);
const pathType = getArg(5, 'filepath');

if (!uuidArg) {
  JSON.stringify({ success: false, error: "Usage: getRecordPath.js <uuid> [filepath|dbpath]" });
} else {
  try {
    const app = Application("DEVONthink");
    const uuid = extractUuid(uuidArg);
    const record = app.getRecordWithUuid(uuid);

    if (!record) {
      JSON.stringify({ success: false, error: "Record not found: " + uuid });
    } else {
      const result = { success: true, uuid: uuid };

      if (pathType === 'dbpath') {
        result.location = record.location();
        result.database = record.database().name();
      } else {
        result.path = record.path();
      }

      JSON.stringify(result);
    }
  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
