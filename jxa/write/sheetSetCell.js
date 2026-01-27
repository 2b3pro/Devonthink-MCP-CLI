#!/usr/bin/env osascript -l JavaScript
// Set a cell value in a sheet
// Usage: osascript -l JavaScript sheetSetCell.js '<json>'
// JSON format: {"uuid":"...", "column":1, "row":1, "value":"..."}
// Required: uuid, column (1-based index or name), row (1-based index), value
//
// Dependencies (injected by runner):
// - getArg, extractUuid

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({ success: false, error: 'Usage: sheetSetCell.js \'{"uuid":"...", "column":1, "row":1, "value":"..."}\'' });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const app = Application("DEVONthink");

    if (!params.uuid) throw new Error("uuid is required");
    if (params.column === undefined) throw new Error("column is required (1-based index or column name)");
    if (params.row === undefined) throw new Error("row is required (1-based index)");
    if (params.value === undefined) throw new Error("value is required");

    const record = app.getRecordWithUuid(extractUuid(params.uuid));
    if (!record || !record.exists()) {
      throw new Error("Record not found: " + params.uuid);
    }

    if (record.recordType() !== "sheet") {
      throw new Error("Record is not a sheet (type: " + record.recordType() + ")");
    }

    const cells = record.cells();
    const row = parseInt(params.row, 10);

    if (row < 1 || row > cells.length) {
      throw new Error("Row " + row + " out of range (1-" + cells.length + ")");
    }

    // Get old value
    const oldValue = app.getCellAt(record, { column: params.column, row: row });
    const newValue = String(params.value);

    // Set new value (returns false if value is unchanged)
    const success = app.setCellAt(record, {
      column: params.column,
      row: row,
      to: newValue
    });

    // Success if either value changed (success=true) or value was already correct
    const unchanged = oldValue === newValue;
    if (!success && !unchanged) {
      throw new Error("Failed to set cell value");
    }

    JSON.stringify({
      success: true,
      uuid: params.uuid,
      column: params.column,
      row: row,
      oldValue: oldValue,
      newValue: newValue,
      changed: !unchanged
    });
  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
