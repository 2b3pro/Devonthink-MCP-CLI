/**
 * Sheet Command Tests
 * Tests for CSV/TSV sheet management in DEVONthink
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  runCommand,
  runJxaScript,
  cleanupTestRecords,
  uniqueName,
  TEST_DATABASE
} from './helpers.js';

// Track records for cleanup
const createdRecords = [];

/**
 * Create a test sheet in Test_Database
 * @param {object} options - Sheet options
 * @returns {Promise<string>} UUID of created sheet
 */
async function createTestSheet(options = {}) {
  const {
    name = uniqueName('TestSheet'),
    columns = ['Col1#text', 'Col2#text', 'Col3#url'],
    cells = [
      ['Row1-A', 'Row1-B', 'https://row1.example.com'],
      ['Row2-A', 'Row2-B', 'https://row2.example.com']
    ]
  } = options;

  const script = `
    ObjC.import("Foundation");
    try {
      const app = Application("DEVONthink");
      const db = app.databases().find(d => d.uuid() === "${TEST_DATABASE.uuid}");
      if (!db) throw new Error("Test database not found");

      const sheet = app.createRecordWith({
        name: ${JSON.stringify(name)},
        type: "sheet",
        columns: ${JSON.stringify(columns)},
        cells: ${JSON.stringify(cells)}
      }, { in: db.root() });

      JSON.stringify({ success: true, uuid: sheet.uuid(), name: sheet.name() });
    } catch (e) {
      JSON.stringify({ success: false, error: e.message });
    }
  `;

  const result = await runJxaScript(script);
  if (!result.success) {
    throw new Error(`Failed to create test sheet: ${result.error}`);
  }
  return result.uuid;
}

describe('sheet command', () => {
  let testSheetUuid;

  before(async () => {
    // Create a test sheet for read-only tests
    testSheetUuid = await createTestSheet({
      name: uniqueName('SheetTest'),
      columns: ['Name#text', 'Count#int', 'URL#url'],
      cells: [
        ['Item A', '10', 'https://a.example.com'],
        ['Item B', '20', 'https://b.example.com'],
        ['Item C', '30', 'https://c.example.com']
      ]
    });
    createdRecords.push(testSheetUuid);
  });

  after(async () => {
    await cleanupTestRecords(createdRecords);
  });

  describe('sheet get', () => {
    it('should get sheet data with columns and cells', async () => {
      const result = await runCommand(['sheet', 'get', testSheetUuid]);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.uuid, testSheetUuid);
      assert.strictEqual(result.columnCount, 3);
      assert.strictEqual(result.rowCount, 3);

      // Check column definitions
      assert.strictEqual(result.columns[0].name, 'Name');
      assert.strictEqual(result.columns[0].type, 'text');
      assert.strictEqual(result.columns[1].name, 'Count');
      assert.strictEqual(result.columns[1].type, 'int');
      assert.strictEqual(result.columns[2].name, 'URL');
      assert.strictEqual(result.columns[2].type, 'url');

      // Check cells
      assert.deepStrictEqual(result.cells[0], ['Item A', '10', 'https://a.example.com']);
      assert.deepStrictEqual(result.cells[1], ['Item B', '20', 'https://b.example.com']);
    });

    it('should fail for non-sheet records', async () => {
      // Use the Test_Database root group UUID (which is a group, not a sheet)
      const result = await runCommand(['sheet', 'get', TEST_DATABASE.uuid], { expectFailure: true });

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('not a sheet'));
    });

    it('should fail for invalid UUID', async () => {
      const result = await runCommand(['sheet', 'get', 'INVALID-UUID-12345'], { expectFailure: true });

      assert.strictEqual(result.success, false);
    });
  });

  describe('sheet get-cell', () => {
    it('should get cell by column index', async () => {
      const result = await runCommand(['sheet', 'get-cell', testSheetUuid, '-c', '1', '-r', '1']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 'Item A');
      assert.strictEqual(result.row, 1);
    });

    it('should get cell by column name', async () => {
      const result = await runCommand(['sheet', 'get-cell', testSheetUuid, '-c', 'Count', '-r', '2']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, '20');
    });

    it('should fail for out-of-range row', async () => {
      const result = await runCommand(['sheet', 'get-cell', testSheetUuid, '-c', '1', '-r', '99'], { expectFailure: true });

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('out of range'));
    });
  });

  describe('sheet set-cell', () => {
    let modifySheetUuid;

    before(async () => {
      // Create separate sheet for modification tests
      modifySheetUuid = await createTestSheet({
        name: uniqueName('ModifySheet'),
        columns: ['A#text', 'B#text'],
        cells: [['X', 'Y'], ['P', 'Q']]
      });
      createdRecords.push(modifySheetUuid);
    });

    it('should set cell value by index', async () => {
      const result = await runCommand(['sheet', 'set-cell', modifySheetUuid, '-c', '1', '-r', '1', '--value', 'NEW']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.oldValue, 'X');
      assert.strictEqual(result.newValue, 'NEW');
      assert.strictEqual(result.changed, true);

      // Verify the change
      const verify = await runCommand(['sheet', 'get-cell', modifySheetUuid, '-c', '1', '-r', '1']);
      assert.strictEqual(verify.value, 'NEW');
    });

    it('should set cell value by column name', async () => {
      const result = await runCommand(['sheet', 'set-cell', modifySheetUuid, '-c', 'B', '-r', '2', '--value', 'CHANGED']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.newValue, 'CHANGED');
    });

    it('should report unchanged when setting same value', async () => {
      const result = await runCommand(['sheet', 'set-cell', modifySheetUuid, '-c', 'B', '-r', '2', '--value', 'CHANGED']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.changed, false);
    });
  });

  describe('sheet add-row', () => {
    let addRowSheetUuid;

    before(async () => {
      addRowSheetUuid = await createTestSheet({
        name: uniqueName('AddRowSheet'),
        columns: ['C1#text', 'C2#text'],
        cells: [['A', 'B']]
      });
      createdRecords.push(addRowSheetUuid);
    });

    it('should add row at end by default', async () => {
      const result = await runCommand(['sheet', 'add-row', addRowSheetUuid, '--cells', 'X,Y']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.rowIndex, 2);
      assert.deepStrictEqual(result.cells, ['X', 'Y']);
      assert.strictEqual(result.totalRows, 2);
    });

    it('should add row at specific position', async () => {
      const result = await runCommand(['sheet', 'add-row', addRowSheetUuid, '--cells', 'M,N', '-p', '1']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.rowIndex, 1);
      assert.strictEqual(result.totalRows, 3);

      // Verify order
      const verify = await runCommand(['sheet', 'get', addRowSheetUuid]);
      assert.deepStrictEqual(verify.cells[0], ['M', 'N']);
    });

    it('should accept JSON array for cells', async () => {
      const result = await runCommand(['sheet', 'add-row', addRowSheetUuid, '--cells', '["J","K"]']);

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.cells, ['J', 'K']);
    });

    it('should pad short rows with empty strings', async () => {
      // Create sheet with 3 columns
      const sheet3col = await createTestSheet({
        name: uniqueName('Pad3Col'),
        columns: ['A#text', 'B#text', 'C#text'],
        cells: [['1', '2', '3']]
      });
      createdRecords.push(sheet3col);

      const result = await runCommand(['sheet', 'add-row', sheet3col, '--cells', 'Only']);

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.cells, ['Only', '', '']);
    });
  });

  describe('sheet delete-row', () => {
    let deleteRowSheetUuid;

    before(async () => {
      deleteRowSheetUuid = await createTestSheet({
        name: uniqueName('DeleteRowSheet'),
        columns: ['ID#text'],
        cells: [['R1'], ['R2'], ['R3'], ['R4']]
      });
      createdRecords.push(deleteRowSheetUuid);
    });

    it('should delete row at position', async () => {
      const result = await runCommand(['sheet', 'delete-row', deleteRowSheetUuid, '-p', '2']);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.deletedPosition, 2);
      assert.deepStrictEqual(result.deletedRow, ['R2']);
      assert.strictEqual(result.remainingRows, 3);
    });

    it('should fail for out-of-range position', async () => {
      const result = await runCommand(['sheet', 'delete-row', deleteRowSheetUuid, '-p', '99'], { expectFailure: true });

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('does not exist'));
    });
  });

  describe('sheet set-rows', () => {
    let setRowsSheetUuid;

    before(async () => {
      setRowsSheetUuid = await createTestSheet({
        name: uniqueName('SetRowsSheet'),
        columns: ['X#text', 'Y#text'],
        cells: [['old1', 'old2']]
      });
      createdRecords.push(setRowsSheetUuid);
    });

    it('should replace all rows', async () => {
      const newCells = [['new1', 'new2'], ['new3', 'new4'], ['new5', 'new6']];
      const result = await runCommand(['sheet', 'set-rows', setRowsSheetUuid, '--cells', JSON.stringify(newCells)]);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.rowCount, 3);

      // Verify
      const verify = await runCommand(['sheet', 'get', setRowsSheetUuid]);
      assert.strictEqual(verify.rowCount, 3);
      assert.deepStrictEqual(verify.cells[0], ['new1', 'new2']);
    });

    it('should reject empty array', async () => {
      const result = await runCommand(['sheet', 'set-rows', setRowsSheetUuid, '--cells', '[]'], { expectFailure: true });

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('non-empty'));
    });
  });
});
