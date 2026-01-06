#!/usr/bin/env osascript -l JavaScript
// List contents of a DEVONthink group
// Usage: osascript -l JavaScript listGroupContents.js <json>
//    OR: osascript -l JavaScript listGroupContents.js <groupUuid>
//    OR: osascript -l JavaScript listGroupContents.js <database> <path>
//
// Dependencies (injected by runner):
// - getArg, isUuid, extractUuid, resolveGroup

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

    // Check if arg1 is JSON
    let params = null;
    try {
      if (arg1.trim().startsWith("{")) {
        params = JSON.parse(arg1);
      }
    } catch (e) {
      // Not JSON
    }

    if (params && params.groupRef) {
      // JSON mode
      group = app.getRecordWithUuid(extractUuid(params.groupRef));
      if (!group) throw new Error("Group not found with UUID: " + params.groupRef);
    } else {
      // Legacy CLI mode
      const looksLikeUuid = isUuid(arg1);

      if (looksLikeUuid && !arg2) {
        // Treat as UUID
        group = app.getRecordWithUuid(extractUuid(arg1));
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
          // We can use resolveGroup from helpers but it takes database object
          // resolveGroup(app, path, db)
          // But resolveGroup in helpers might throw if path not found, which is fine.
          // However, resolveGroup implementation in helpers:
          // function resolveGroup(theApp, ref, database) { ... }
          
          group = resolveGroup(app, groupPath, db);
        }
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