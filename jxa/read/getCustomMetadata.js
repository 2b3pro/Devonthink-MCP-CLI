#!/usr/bin/env osascript -l JavaScript
// Get custom metadata from a DEVONthink record
// Usage: osascript -l JavaScript getCustomMetadata.js '<json>'
// JSON format: {"uuid":"...","field":"..."} or {"uuid":"...","all":true}
//
// Modes:
//   Single field: Provide uuid and field to get a specific value
//   All fields: Provide uuid and all:true to get all custom metadata
//
// Examples:
//   osascript -l JavaScript getCustomMetadata.js '{"uuid":"ABC123","field":"author"}'
//   osascript -l JavaScript getCustomMetadata.js '{"uuid":"ABC123","all":true}'

ObjC.import("Foundation");

function isUuid(str) {
  if (!str || typeof str !== "string") return false;
  if (str.startsWith("x-devonthink-item://")) return true;
  if (str.includes("/")) return false;
  return /^[A-F0-9-]{8,}$/i.test(str) && str.includes("-");
}

function extractUuid(str) {
  if (!str) return null;
  const urlMatch = str.match(/^x-devonthink-item:\/\/([A-F0-9-]+)$/i);
  if (urlMatch) return urlMatch[1];
  if (isUuid(str)) return str;
  return str;
}

function getArg(index, defaultValue) {
  const args = $.NSProcessInfo.processInfo.arguments;
  if (args.count <= index) return defaultValue;
  const arg = ObjC.unwrap(args.objectAtIndex(index));
  return arg && arg.length > 0 ? arg : defaultValue;
}

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({
    success: false,
    error: 'Usage: getCustomMetadata.js \'{"uuid":"...","field":"..."}\' or \'{"uuid":"...","all":true}\''
  });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const { uuid, field, all } = params;

    if (!uuid) throw new Error("Missing required field: uuid");

    const app = Application("DEVONthink");
    const record = app.getRecordWithUuid(extractUuid(uuid));

    if (!record) throw new Error("Record not found: " + uuid);

    if (all) {
      // Get all custom metadata
      const metadata = record.customMetaData() || {};
      const fields = [];

      for (const key of Object.keys(metadata)) {
        const val = metadata[key];
        fields.push({
          field: key,
          value: val,
          type: val === null ? "null" : typeof val
        });
      }

      // Sort alphabetically by field name
      fields.sort((a, b) => a.field.localeCompare(b.field));

      JSON.stringify({
        success: true,
        uuid: uuid,
        name: record.name(),
        count: fields.length,
        metadata: fields
      }, null, 2);

    } else if (field) {
      // Get specific field
      const value = app.getCustomMetaData({ for: field, from: record });

      JSON.stringify({
        success: true,
        uuid: uuid,
        name: record.name(),
        field: field,
        value: value,
        type: value === null ? "null" : typeof value
      }, null, 2);

    } else {
      throw new Error("Either 'field' or 'all:true' is required");
    }

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
