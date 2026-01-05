#!/usr/bin/env osascript -l JavaScript
// List contents of a DEVONthink group
// Usage: osascript -l JavaScript listGroupContents.js <groupUuid>
//    OR: osascript -l JavaScript listGroupContents.js <database> <path>
// Examples:
//   osascript -l JavaScript listGroupContents.js "ABC123-DEF456"
//   osascript -l JavaScript listGroupContents.js "Inbox" "/"
//   osascript -l JavaScript listGroupContents.js "IAS Personal" "/Projects/Archive"

ObjC.import("Foundation");

function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count <= index) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(index));
  return arg && arg.length > 0 ? arg : defaultValue;
}

const arg1 = getArg(4, null);
const arg2 = getArg(5, null);

if (!arg1) {
  JSON.stringify({
    success: false,
    error: "Usage: listGroupContents.js <groupUuid> OR listGroupContents.js <database> <path>"
  });
} else {
  try {
    const app = Application("DEVONthink");
    let group = null;

    // If only one arg and it looks like a UUID (contains hyphens and is long enough)
    const looksLikeUuid = arg1.includes("-") && arg1.length > 20;

    if (looksLikeUuid && !arg2) {
      // Treat as UUID
      group = app.getRecordWithUuid(arg1);
      if (!group) throw new Error("Group not found with UUID: " + arg1);
    } else {
      // Treat as database + path
      const databaseName = arg1;
      const groupPath = arg2 || "/";

      const databases = app.databases();
      const db = databases.find(d => d.name() === databaseName);
      if (!db) throw new Error("Database not found: " + databaseName);

      if (!groupPath || groupPath === "/") {
        group = db.root();
      } else {
        // Navigate path
        const parts = groupPath.split("/").filter(p => p.length > 0);
        let current = db.root();
        for (const part of parts) {
          const children = current.children();
          const found = children.find(c => c.name() === part);
          if (!found) throw new Error("Path not found: " + groupPath);
          current = found;
        }
        group = current;
      }
    }

    if (!group) throw new Error("Group not found");

    const recordType = group.recordType();
    if (recordType !== "group" && recordType !== "smart group") {
      throw new Error("Not a group: " + recordType);
    }

    const children = group.children();
    const items = children.map(c => ({
      uuid: c.uuid(),
      name: c.name(),
      recordType: c.recordType(),
      tags: c.tags(),
      modificationDate: c.modificationDate() ? c.modificationDate().toString() : null
    }));

    JSON.stringify({
      success: true,
      group: group.name(),
      uuid: group.uuid(),
      path: group.location(),
      itemCount: items.length,
      items: items
    }, null, 2);

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
