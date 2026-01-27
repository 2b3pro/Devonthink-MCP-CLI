#!/usr/bin/env osascript -l JavaScript
// Get sheet data (columns, cells, metadata)
// Usage: osascript -l JavaScript sheetGet.js '<json>'
// JSON format: {"uuid":"..."}
// Required: uuid
//
// Returns columns (with name/type), cells (2D array), and metadata
//
// Dependencies (injected by runner):
// - getArg, extractUuid

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({ success: false, error: 'Usage: sheetGet.js \'{"uuid":"..."}\'' });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const app = Application("DEVONthink");

    if (!params.uuid) {
      throw new Error("uuid is required");
    }

    const record = app.getRecordWithUuid(extractUuid(params.uuid));
    if (!record || !record.exists()) {
      throw new Error("Record not found: " + params.uuid);
    }

    const recordType = record.recordType();
    if (recordType !== "sheet") {
      throw new Error("Record is not a sheet (type: " + recordType + ")");
    }

    const columns = record.columns();
    const cells = record.cells();

    // Parse column definitions
    const columnDefs = columns.map(function(col) {
      const parts = col.split('#');
      return {
        name: parts[0],
        type: parts[1] || 'text',
        raw: col
      };
    });

    JSON.stringify({
      success: true,
      uuid: record.uuid(),
      name: record.name(),
      database: record.database().name(),
      columns: columnDefs,
      cells: cells,
      rowCount: cells.length,
      columnCount: columns.length
    });
  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
