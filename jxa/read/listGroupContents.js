#!/usr/bin/env osascript -l JavaScript
// List contents of a DEVONthink group with optional recursive depth
// Usage: osascript -l JavaScript listGroupContents.js <json>
//    OR: osascript -l JavaScript listGroupContents.js <groupUuid>
//    OR: osascript -l JavaScript listGroupContents.js <database> <path>
//
// JSON params:
//   groupRef: UUID or x-devonthink-item:// URL (required if no database/path)
//   database: Database name (alternative to groupRef)
//   path: Path within database (default "/", used with database)
//   depth: Number of levels to traverse (default 1, -1 for unlimited)
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
    let maxDepth = 1; // Default: single level (original behavior)

    // Check if arg1 is JSON
    let params = null;
    try {
      if (arg1.trim().startsWith("{")) {
        params = JSON.parse(arg1);
      }
    } catch (e) {
      // Not JSON
    }

    if (params) {
      // JSON mode - parse depth first
      if (params.depth !== undefined) {
        maxDepth = parseInt(params.depth, 10);
        if (isNaN(maxDepth)) maxDepth = 1;
        if (maxDepth === -1) maxDepth = 100; // Unlimited = 100 levels deep
      }

      if (params.groupRef) {
        // UUID mode
        group = app.getRecordWithUuid(extractUuid(params.groupRef));
        if (!group) throw new Error("Group not found with UUID: " + params.groupRef);
      } else if (params.database) {
        // Database + path mode
        const databases = app.databases();
        const db = databases.find(d => d.name() === params.database);
        if (!db) throw new Error("Database not found: " + params.database);

        const groupPath = params.path || "/";
        if (!groupPath || groupPath === "/") {
          group = db.root();
        } else {
          group = resolveGroup(app, groupPath, db);
        }
      } else {
        throw new Error("Either groupRef or database must be provided");
      }
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
          group = resolveGroup(app, groupPath, db);
        }
      }
    }

    if (!group) throw new Error("Group not found");

    const recordType = group.recordType();
    if (recordType !== "group" && recordType !== "smart group") {
      throw new Error("Not a group: " + recordType);
    }

    // Collect items with recursive traversal using batch property access
    // Each batch call (e.g. children.uuid()) is a single Apple Event for all children,
    // vs per-item calls which are N separate Apple Events.
    // depth=1 means direct children only (level 0)
    // depth=2 means children and grandchildren (levels 0-1)
    // depth=N means levels 0 through N-1
    const items = [];

    function collectItems(parentGroup, currentLevel) {
      if (currentLevel >= maxDepth) return;

      // Use element specifier (no parens) for batch property access:
      // parentGroup.children.uuid() = 1 Apple Event for all UUIDs
      // vs parentGroup.children()[i].uuid() = N Apple Events
      const childSpec = parentGroup.children;
      const count = childSpec.length;
      if (count === 0) return;

      // Batch property access: 4 Apple Events instead of 4*N
      const uuids = childSpec.uuid();
      const names = childSpec.name();
      const types = childSpec.recordType();
      const locations = childSpec.location();

      // Resolve the array once for indexed access (recursion, grandchildren)
      const childArray = childSpec();

      for (let i = 0; i < count; i++) {
        const cType = types[i];
        const isGroup = cType === "group" || cType === "smart group";

        const item = {
          uuid: uuids[i],
          name: names[i],
          type: cType,
          level: currentLevel,
          path: locations[i] + names[i]
        };

        // Include itemCount for groups via batch recordType on grandchildren
        if (isGroup) {
          const grandSpec = childArray[i].children;
          const grandCount = grandSpec.length;
          if (grandCount > 0) {
            const grandTypes = grandSpec.recordType();
            item.itemCount = grandTypes.filter(function(t) {
              return t !== "group" && t !== "smart group";
            }).length;
          } else {
            item.itemCount = 0;
          }
        }

        items.push(item);

        // Recurse into groups if we haven't hit max depth
        if (isGroup && currentLevel + 1 < maxDepth) {
          collectItems(childArray[i], currentLevel + 1);
        }
      }
    }

    collectItems(group, 0);

    JSON.stringify({
      success: true,
      group: group.name(),
      uuid: group.uuid(),
      path: group.location(),
      depth: maxDepth,
      totalItems: items.length,
      items: items
    }, null, 2);

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}