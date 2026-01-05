#!/usr/bin/env osascript -l JavaScript
// Create a new DEVONthink record
// Usage: osascript -l JavaScript createRecord.js '<json>'
// JSON format: {"name":"Title","type":"markdown","database":"Inbox","groupPath":"/","content":"...","url":"...","tags":["tag1"]}
// Required: name, type, database (name or UUID)
// Optional: groupPath (path or UUID, default "/"), content, url (for bookmarks), tags
// Types: markdown, txt, rtf, bookmark, html, group
//
// Examples:
//   osascript -l JavaScript createRecord.js '{"name":"My Note","type":"markdown","database":"Inbox","content":"# Hello"}'
//   osascript -l JavaScript createRecord.js '{"name":"Link","type":"bookmark","database":"A1B2-C3D4-...","url":"https://example.com"}'
//   osascript -l JavaScript createRecord.js '{"name":"New Folder","type":"group","database":"IAS Personal","groupPath":"/Projects"}'

ObjC.import("Foundation");

function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count <= index) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(index));
  return arg && arg.length > 0 ? arg : defaultValue;
}

// Detect if string looks like a UUID (alphanumeric with hyphens, no slashes)
function isUuid(str) {
  if (!str || typeof str !== "string" || str.includes("/")) return false;
  return /^[A-F0-9-]{8,}$/i.test(str) && str.includes("-");
}

// Resolve database by name or UUID
function getDatabase(theApp, ref) {
  if (!ref) return theApp.currentDatabase();
  if (isUuid(ref)) {
    const record = theApp.getRecordWithUuid(ref);
    if (record) return record.database();
    throw new Error("Database not found with UUID: " + ref);
  }
  const databases = theApp.databases();
  const found = databases.find(db => db.name() === ref);
  if (!found) throw new Error("Database not found: " + ref);
  return found;
}

// Resolve group by path or UUID
function resolveGroup(theApp, ref, database) {
  if (!ref || ref === "/") return database.root();
  if (isUuid(ref)) {
    const group = theApp.getRecordWithUuid(ref);
    if (!group) throw new Error("Group not found with UUID: " + ref);
    const type = group.recordType();
    if (type !== "group" && type !== "smart group") {
      throw new Error("UUID does not point to a group: " + type);
    }
    return group;
  }
  // Navigate path
  let current = database.root();
  const parts = ref.split("/").filter(p => p.length > 0);
  for (const part of parts) {
    const children = current.children();
    const found = children.find(c => c.name() === part);
    if (!found) throw new Error("Group not found: " + part);
    current = found;
  }
  return current;
}

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({
    success: false,
    error: 'Usage: createRecord.js \'{"name":"...","type":"...","database":"..."}\''
  });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const { name, type, database: databaseRef, groupPath, content, url, tags } = params;

    if (!name) throw new Error("Missing required field: name");
    if (!type) throw new Error("Missing required field: type");
    if (!databaseRef) throw new Error("Missing required field: database");

    const app = Application("DEVONthink");

    // Find database (by name or UUID)
    const db = getDatabase(app, databaseRef);

    // Find destination group (by path or UUID)
    const destination = resolveGroup(app, groupPath || "/", db);

    // Create record options
    const createOptions = {
      name: name,
      in: destination
    };

    if (content) createOptions.content = content;
    if (url) createOptions.URL = url;

    // Create record based on type
    let record;
    switch (type) {
      case "markdown":
        record = app.createRecordWith(createOptions, { type: "markdown" });
        break;
      case "txt":
        record = app.createRecordWith(createOptions, { type: "txt" });
        break;
      case "rtf":
        record = app.createRecordWith(createOptions, { type: "rtf" });
        break;
      case "bookmark":
        if (!url) throw new Error("URL required for bookmark type");
        record = app.createRecordWith(createOptions, { type: "bookmark" });
        break;
      case "html":
        record = app.createRecordWith(createOptions, { type: "html" });
        break;
      case "group":
        record = app.createRecordWith({ name: name, in: destination, type: "group" });
        break;
      default:
        throw new Error("Unknown type: " + type + ". Valid: markdown, txt, rtf, bookmark, html, group");
    }

    if (!record) throw new Error("Failed to create record");

    // Apply tags if specified
    if (tags && Array.isArray(tags) && tags.length > 0) {
      record.tags = tags;
    }

    JSON.stringify({
      success: true,
      uuid: record.uuid(),
      name: record.name(),
      location: record.location(),
      database: db.name(),
      recordType: record.recordType()
    }, null, 2);

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
