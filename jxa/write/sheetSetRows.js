#!/usr/bin/env osascript -l JavaScript
// Replace all rows in a sheet
// Usage: osascript -l JavaScript sheetSetRows.js '<json>'
// JSON format: {"uuid":"...", "cells":[["a","b"],["c","d"]]}
// Required: uuid, cells (2D array)
//
// Dependencies (injected by runner):
// - getArg, extractUuid

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({ success: false, error: 'Usage: sheetSetRows.js \'{"uuid":"...", "cells":[["a","b"],["c","d"]]}\'' });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const app = Application("DEVONthink");

    if (!params.uuid) throw new Error("uuid is required");
    if (!params.cells || !Array.isArray(params.cells)) {
      throw new Error("cells must be a 2D array");
    }

    const record = app.getRecordWithUuid(extractUuid(params.uuid));
    if (!record || !record.exists()) {
      throw new Error("Record not found: " + params.uuid);
    }

    if (record.recordType() !== "sheet") {
      throw new Error("Record is not a sheet (type: " + record.recordType() + ")");
    }

    const columns = record.columns();
    const columnCount = columns.length;

    // Normalize all rows to match column count
    const normalizedCells = params.cells.map(function(row) {
      if (!Array.isArray(row)) {
        throw new Error("Each row must be an array");
      }
      var normalizedRow = row.map(function(c) { return String(c); });
      // Pad with empty strings
      while (normalizedRow.length < columnCount) {
        normalizedRow.push("");
      }
      // Truncate if too long
      if (normalizedRow.length > columnCount) {
        normalizedRow.length = columnCount;
      }
      return normalizedRow;
    });

    // Set all cells
    record.cells = normalizedCells;

    JSON.stringify({
      success: true,
      uuid: params.uuid,
      rowCount: normalizedCells.length,
      columnCount: columnCount
    });
  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
