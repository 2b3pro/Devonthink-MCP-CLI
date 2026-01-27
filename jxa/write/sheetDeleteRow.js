#!/usr/bin/env osascript -l JavaScript
// Delete a row from a sheet
// Usage: osascript -l JavaScript sheetDeleteRow.js '<json>'
// JSON format: {"uuid":"...", "position":1}
// Required: uuid, position (1-based index)
//
// Dependencies (injected by runner):
// - getArg, extractUuid

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({ success: false, error: 'Usage: sheetDeleteRow.js \'{"uuid":"...", "position":1}\'' });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const app = Application("DEVONthink");

    if (!params.uuid) throw new Error("uuid is required");
    if (params.position === undefined) throw new Error("position is required (1-based index)");

    const position = parseInt(params.position, 10);
    if (isNaN(position) || position < 1) {
      throw new Error("position must be a positive integer");
    }

    const record = app.getRecordWithUuid(extractUuid(params.uuid));
    if (!record || !record.exists()) {
      throw new Error("Record not found: " + params.uuid);
    }

    if (record.recordType() !== "sheet") {
      throw new Error("Record is not a sheet (type: " + record.recordType() + ")");
    }

    const currentCells = record.cells();

    if (position > currentCells.length) {
      throw new Error("Row " + position + " does not exist (sheet has " + currentCells.length + " rows)");
    }

    // Remove row (using cells property for reliability)
    const deletedRow = currentCells[position - 1];
    var newCells = currentCells.slice();
    newCells.splice(position - 1, 1);
    record.cells = newCells;

    JSON.stringify({
      success: true,
      uuid: params.uuid,
      deletedPosition: position,
      deletedRow: deletedRow,
      remainingRows: newCells.length
    });
  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
