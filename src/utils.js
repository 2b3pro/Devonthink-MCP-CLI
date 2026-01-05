/**
 * Shared utilities for DEVONthink CLI
 */

/**
 * Detect if a string looks like a DEVONthink UUID
 * UUIDs are alphanumeric with hyphens, no slashes
 * @param {string} str - String to check
 * @returns {boolean} - True if looks like a UUID
 */
export function isUuid(str) {
  if (!str || str.includes('/')) return false;
  // DEVONthink UUIDs: alphanumeric with hyphens, typically uppercase
  // Match patterns like: A1B2C3D4-E5F6-7890-ABCD-EF1234567890 or shorter variants
  return /^[A-F0-9-]{8,}$/i.test(str) && str.includes('-');
}

/**
 * Escape a string for use in JXA template literals
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Generate JXA code to resolve a database reference (name or UUID)
 * @param {string} varName - Variable name for the database in JXA
 * @param {string} ref - The reference (name or UUID)
 * @param {boolean} refIsUuid - Whether the reference is a UUID
 * @returns {string} - JXA code snippet
 */
export function jxaResolveDatabase(varName, ref, refIsUuid) {
  const escaped = escapeString(ref);
  if (refIsUuid) {
    return `
  // Find database by UUID
  const ${varName}Record = app.getRecordWithUuid("${escaped}");
  if (!${varName}Record) throw new Error("Database not found with UUID: ${escaped}");
  const ${varName} = ${varName}Record.database();`;
  } else {
    return `
  // Find database by name
  const ${varName} = app.databases().find(d => d.name() === "${escaped}");
  if (!${varName}) throw new Error("Database not found: ${escaped}");`;
  }
}

/**
 * Generate JXA code to resolve a group reference (path or UUID)
 * @param {string} varName - Variable name for the group in JXA
 * @param {string} ref - The reference (path or UUID)
 * @param {boolean} refIsUuid - Whether the reference is a UUID
 * @param {string} dbVarName - Variable name of the database (for path resolution)
 * @param {boolean} createIfMissing - Whether to create missing path components
 * @returns {string} - JXA code snippet
 */
export function jxaResolveGroup(varName, ref, refIsUuid, dbVarName = 'db', createIfMissing = true) {
  const escaped = escapeString(ref);

  if (refIsUuid) {
    return `
  // Find group by UUID
  const ${varName} = app.getRecordWithUuid("${escaped}");
  if (!${varName}) throw new Error("Group not found with UUID: ${escaped}");
  const ${varName}Type = ${varName}.recordType();
  if (${varName}Type !== "group" && ${varName}Type !== "smart group") {
    throw new Error("UUID does not point to a group: " + ${varName}Type);
  }`;
  } else if (ref === '/' || ref === '') {
    return `
  // Use database root
  const ${varName} = ${dbVarName}.root();`;
  } else {
    const createCode = createIfMissing
      ? `
        const newGroup = app.createRecordWith({ name: part, type: "group" }, { in: ${varName} });
        ${varName} = newGroup;`
      : `throw new Error("Group not found: " + part);`;

    return `
  // Navigate path to find/create group
  let ${varName} = ${dbVarName}.root();
  const ${varName}Parts = "${escaped}".split("/").filter(p => p.length > 0);
  for (const part of ${varName}Parts) {
    const children = ${varName}.children();
    const found = children.find(c => c.name() === part);
    if (!found) {${createCode}
    } else {
      ${varName} = found;
    }
  }`;
  }
}
