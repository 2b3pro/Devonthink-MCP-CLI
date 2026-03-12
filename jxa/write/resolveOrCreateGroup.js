#!/usr/bin/env osascript -l JavaScript
// Resolve or create a group by database (name or UUID) and path
// Usage: osascript -l JavaScript resolveOrCreateGroup.js '<json>'
// JSON format: {"database":"...", "path":"/path/to/group"}
// database can be name or UUID (auto-detected)
//
// Returns: {"success":true, "uuid":"...", "created":true/false, "path":"..."}
//
// Examples:
//   osascript -l JavaScript resolveOrCreateGroup.js '{"database":"Hypnosis NLP","path":"/Authors A—Z/L/LAST, First"}'
//   osascript -l JavaScript resolveOrCreateGroup.js '{"database":"A1B2-C3D4-...","path":"/Topics A—Z/A/AI Research"}'

ObjC.import("Foundation");

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({
    success: false,
    error: 'Usage: resolveOrCreateGroup.js \'{"database":"...","path":"..."}\''
  });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const { database, path } = params;

    if (!database) throw new Error("Missing required field: database");
    if (!path) throw new Error("Missing required field: path");

    const app = Application("DEVONthink");

    // Find the database by name or UUID
    const targetDb = getDatabase(app, database);

    // Parse the path into components
    const pathParts = path.split("/").filter(p => p.length > 0);

    if (pathParts.length === 0) {
      // Return the database root
      const root = targetDb.root();
      JSON.stringify({
        success: true,
        uuid: root.uuid(),
        name: root.name(),
        path: "/",
        created: false
      });
    } else {
      // Navigate/create path
      let currentGroup = targetDb.root();
      let created = false;
      const createdParts = [];

      // Helper: normalize string for comparison
      function normalize(str) {
        return str.toUpperCase().trim().replace(/\s+/g, ' ');
      }

      // Helper: extract lastname from "LASTNAME, Firstname" format
      function getLastname(str) {
        const comma = str.indexOf(',');
        return comma > 0 ? str.substring(0, comma).trim().toUpperCase() : str.trim().toUpperCase();
      }

      // Helper: check if name looks like an author (contains comma)
      function isAuthorName(str) {
        return str.includes(',');
      }

      // Helper: get first word for topic matching
      function getFirstWord(str) {
        return str.split(/[\s,\-&]+/)[0].toUpperCase();
      }

      // Helper: find matching group with fuzzy logic using batch property access
      // Prefers regular groups over smart groups (can't file into smart groups)
      function findMatchingGroup(parentGroup, targetName, isLeaf) {
        const childSpec = parentGroup.children;
        const count = childSpec.length;
        if (count === 0) return null;

        // Batch fetch types and names: 2 Apple Events instead of 2*N
        const types = childSpec.recordType();
        const names = childSpec.name();

        const targetNorm = normalize(targetName);
        const targetLastname = getLastname(targetName);
        const targetFirstWord = getFirstWord(targetName);
        const targetIsAuthor = isAuthorName(targetName);

        // Track matches separately for groups vs smart groups
        // Store indices instead of resolved objects to defer resolution
        let exactGroupIdx = -1;
        let exactSmartIdx = -1;
        let caseGroupIdx = -1;
        let caseSmartIdx = -1;
        let lastnameGroupIdx = -1;
        let lastnameSmartIdx = -1;
        let firstWordGroupIdx = -1;
        let firstWordSmartIdx = -1;

        for (let i = 0; i < count; i++) {
          const childType = types[i];
          const isGroup = (childType === "group");
          const isSmart = (childType === "smart group");
          if (!isGroup && !isSmart) continue;

          const childName = names[i];
          const childNorm = normalize(childName);

          // Exact match
          if (childName === targetName) {
            if (isGroup) { exactGroupIdx = i; break; }
            else if (exactSmartIdx < 0) { exactSmartIdx = i; }
            continue;
          }

          // Case-insensitive match
          if (childNorm === targetNorm) {
            if (isGroup && caseGroupIdx < 0) { caseGroupIdx = i; }
            else if (isSmart && caseSmartIdx < 0) { caseSmartIdx = i; }
            continue;
          }

          // For leaf nodes, apply fuzzy matching
          if (isLeaf) {
            if (targetIsAuthor) {
              const childLastname = getLastname(childName);
              if (childLastname === targetLastname) {
                if (isGroup && lastnameGroupIdx < 0) { lastnameGroupIdx = i; }
                else if (isSmart && lastnameSmartIdx < 0) { lastnameSmartIdx = i; }
              }
            } else {
              const childFirstWord = getFirstWord(childName);
              if (childFirstWord === targetFirstWord && childFirstWord.length > 2) {
                if (isGroup && firstWordGroupIdx < 0) { firstWordGroupIdx = i; }
                else if (isSmart && firstWordSmartIdx < 0) { firstWordSmartIdx = i; }
              }
            }
          }
        }

        // Prefer regular groups over smart groups at each match level
        const bestIdx = exactGroupIdx >= 0 ? exactGroupIdx :
                        exactSmartIdx >= 0 ? exactSmartIdx :
                        caseGroupIdx >= 0 ? caseGroupIdx :
                        caseSmartIdx >= 0 ? caseSmartIdx :
                        lastnameGroupIdx >= 0 ? lastnameGroupIdx :
                        lastnameSmartIdx >= 0 ? lastnameSmartIdx :
                        firstWordGroupIdx >= 0 ? firstWordGroupIdx :
                        firstWordSmartIdx >= 0 ? firstWordSmartIdx : -1;

        // Only resolve the single winning child object
        if (bestIdx >= 0) return childSpec[bestIdx]();
        return null;
      }

      for (let partIdx = 0; partIdx < pathParts.length; partIdx++) {
        const part = pathParts[partIdx];
        const isLeaf = (partIdx === pathParts.length - 1);

        // Look for existing group with fuzzy matching (batch optimized)
        const found = findMatchingGroup(currentGroup, part, isLeaf);

        if (found) {
          currentGroup = found;
          // Track if we used a fuzzy match (name differs from requested)
          if (found.name() !== part) {
            createdParts.push(`(matched: ${found.name()})`);
          }
        } else {
          // Create the group
          const newGroup = app.createRecordWith({
            name: part,
            type: "group"
          }, { in: currentGroup });

          currentGroup = newGroup;
          created = true;
          createdParts.push(part);
        }
      }

      JSON.stringify({
        success: true,
        uuid: currentGroup.uuid(),
        name: currentGroup.name(),
        path: "/" + pathParts.join("/"),
        databaseName: database,
        created: created,
        createdParts: createdParts.length > 0 ? createdParts : undefined
      }, null, 2);
    }

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
