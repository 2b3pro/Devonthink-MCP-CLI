#!/usr/bin/env osascript -l JavaScript
// Delete a DEVONthink record (moves to Trash)
// Usage: osascript -l JavaScript deleteRecord.js <uuid>
//
// Dependencies (injected by runner):
// - getArg, extractUuid

const uuid = getArg(4, null);

if (!uuid) {
  JSON.stringify({ success: false, error: "Usage: deleteRecord.js <uuid>" });
} else {
  const app = Application("DEVONthink");
  const record = app.getRecordWithUuid(extractUuid(uuid));

  if (!record) {
    JSON.stringify({ success: false, error: "Record not found: " + uuid });
  } else {
    try {
      const name = record.name();
      const recordUuid = record.uuid();

      // Delete moves to trash
      app.delete({ record: record });

      JSON.stringify({
        success: true,
        deleted: {
          uuid: recordUuid,
          name: name
        }
      });
    } catch (e) {
      JSON.stringify({ success: false, error: e.message });
    }
  }
}