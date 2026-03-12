#!/usr/bin/env osascript -l JavaScript
// Generate hierarchical tree of DEVONthink folder structure
// Usage: osascript -l JavaScript tree.js '{"database":"...", "path":"/", "depth":3, "counts":true}'
//
// Dependencies (injected by runner):
// - getArg, isUuid, extractUuid, getDatabase, resolveGroup

const jsonArg = getArg(4, "{}");

try {
  const params = JSON.parse(jsonArg);
  const app = Application("DEVONthink");

  const maxDepth = params.depth || 10;
  const includeCounts = params.counts === true;
  const excludeSystem = params.excludeSystem === true;
  const includeSmartGroups = params.smartGroups === true;
  const jsonOutput = params.json === true;

  // System folders to optionally exclude
  const systemFolders = ["_INBOX", "_TRIAGE", "_ARCHIVE", "Tags", "Trash"];

  // Get starting group and database
  let db;
  let startGroup;

  if (params.groupUuid) {
    // UUID provided - get group directly and derive database
    const uuid = extractUuid(params.groupUuid);
    startGroup = app.getRecordWithUuid(uuid);
    if (!startGroup) throw new Error("Group not found: " + uuid);

    const recordType = startGroup.recordType();
    if (recordType !== "group") {
      throw new Error("UUID does not point to a group (found: " + recordType + ")");
    }

    db = startGroup.database();
  } else {
    // Path-based resolution
    if (params.database) {
      db = getDatabase(app, params.database);
    } else {
      db = app.currentDatabase();
    }

    if (!db) throw new Error("No database found");

    if (params.path && params.path !== "/") {
      startGroup = resolveGroup(app, params.path, db);
    } else {
      startGroup = db.root();
    }
  }

  // Recursive tree builder using batch property access
  // Element specifiers (group.children.prop()) fetch all values in a single Apple Event
  function buildTree(group, currentDepth) {
    if (currentDepth > maxDepth) return null;

    const childSpec = group.children;
    const count = childSpec.length;
    if (count === 0) return [];

    // Batch property access: 4 Apple Events instead of 4*N
    const types = childSpec.recordType();
    const names = childSpec.name();
    const uuids = childSpec.uuid();
    const locs = childSpec.location();

    // Resolve array once for indexed access (recursion, grandchildren)
    const childArray = childSpec();

    const subgroups = [];

    for (let i = 0; i < count; i++) {
      const rt = types[i];
      const isGroup = rt === "group";
      const isSmartGroup = rt === "smart group";

      if (isGroup || (includeSmartGroups && isSmartGroup)) {
        const name = names[i];

        // Skip system folders if requested (only applies to regular groups)
        if (excludeSystem && isGroup && systemFolders.includes(name)) {
          continue;
        }

        const node = {
          name: name,
          uuid: uuids[i],
          path: locs[i] + name,
          depth: currentDepth
        };

        if (isSmartGroup) {
          node.isSmartGroup = true;
        }

        // Only recurse into regular groups
        if (isGroup) {
          const childTree = buildTree(childArray[i], currentDepth + 1);
          if (childTree && childTree.length > 0) {
            node.children = childTree;
          }

          if (includeCounts) {
            // Batch recordType on grandchildren: 1 Apple Event instead of M
            const grandSpec = childArray[i].children;
            const grandCount = grandSpec.length;
            if (grandCount > 0) {
              const grandTypes = grandSpec.recordType();
              node.itemCount = grandTypes.filter(function(t) {
                return t !== "group" && t !== "smart group";
              }).length;
            } else {
              node.itemCount = 0;
            }
          }
        }

        subgroups.push(node);
      }
    }

    return subgroups;
  }

  // Build the tree
  const tree = buildTree(startGroup, 1);

  // Format as text tree
  function formatTextTree(nodes, prefix, isLast) {
    let output = "";

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const last = i === nodes.length - 1;
      const connector = last ? "└── " : "├── ";
      const childPrefix = last ? "    " : "│   ";

      // Smart groups shown in brackets, regular groups with trailing slash
      let line;
      if (node.isSmartGroup) {
        line = prefix + connector + "(" + node.name + ")";
      } else {
        line = prefix + connector + node.name + "/";
      }

      if (includeCounts && node.itemCount > 0) {
        line += " (" + node.itemCount + ")";
      }
      output += line + "\n";

      if (node.children && node.children.length > 0) {
        output += formatTextTree(node.children, prefix + childPrefix, last);
      }
    }

    return output;
  }

  const rootName = (params.groupUuid || (params.path && params.path !== "/"))
    ? startGroup.name()
    : db.name();

  let textOutput = rootName + "/\n";
  if (tree && tree.length > 0) {
    textOutput += formatTextTree(tree, "", false);
  }

  JSON.stringify({
    success: true,
    database: db.name(),
    databaseUuid: db.uuid(),
    startPath: params.groupUuid || params.path || "/",
    startUuid: startGroup.uuid(),
    depth: maxDepth,
    tree: tree || [],
    text: textOutput
  }, null, 2);

} catch (e) {
  JSON.stringify({ success: false, error: e.message });
}
