#!/usr/bin/env osascript -l JavaScript
// Delete a DEVONthink record (moves to Trash)
// Usage: osascript -l JavaScript deleteRecord.js <uuid>
// Example:
//   osascript -l JavaScript deleteRecord.js "27D0D443-4E18-40EF-86EE-6F5E15966FC5"

ObjC.import("Foundation");

function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count <= index) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(index));
  return arg && arg.length > 0 ? arg : defaultValue;
}

const uuid = getArg(4, null);

if (!uuid) {
  JSON.stringify({ success: false, error: "Usage: deleteRecord.js <uuid>" });
} else {
  const app = Application("DEVONthink");
  const record = app.getRecordWithUuid(uuid);

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
