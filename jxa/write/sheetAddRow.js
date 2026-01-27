#!/usr/bin/env osascript -l JavaScript
// Add a row to a sheet
// Usage: osascript -l JavaScript sheetAddRow.js '<json>'
// JSON format: {"uuid":"...", "cells":["a","b","c"], "position":1}
// Required: uuid, cells (array of values)
// Optional: position (1-based, defaults to end)
//
// Dependencies (injected by runner):
// - getArg, extractUuid

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({ success: false, error: 'Usage: sheetAddRow.js \'{"uuid":"...", "cells":["a","b","c"]}\'' });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const app = Application("DEVONthink");

    if (!params.uuid) throw new Error("uuid is required");
    if (!params.cells || !Array.isArray(params.cells)) {
      throw new Error("cells array is required");
    }

    const record = app.getRecordWithUuid(extractUuid(params.uuid));
    if (!record || !record.exists()) {
      throw new Error("Record not found: " + params.uuid);
    }

    if (record.recordType() !== "sheet") {
      throw new Error("Record is not a sheet (type: " + record.recordType() + ")");
    }

    const columns = record.columns();
    const currentCells = record.cells();
    const newRow = params.cells.map(function(c) { return String(c); });

    // Pad or truncate row to match column count
    while (newRow.length < columns.length) {
      newRow.push("");
    }
    if (newRow.length > columns.length) {
      newRow.length = columns.length;
    }

    // Determine insert position
    var position = params.position;
    if (position === undefined || position === null || position < 1) {
      // Append to end
      position = currentCells.length + 1;
    } else if (position > currentCells.length + 1) {
      position = currentCells.length + 1;
    }

    // Insert row at position (using cells property for reliability)
    var newCells = currentCells.slice();
    newCells.splice(position - 1, 0, newRow);
    record.cells = newCells;

    JSON.stringify({
      success: true,
      uuid: params.uuid,
      rowIndex: position,
      cells: newRow,
      totalRows: newCells.length
    });
  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
