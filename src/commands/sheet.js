/**
 * Sheet Command
 * Manage CSV/TSV sheet records in DEVONthink
 */

import { runJxa, requireDevonthink } from '../jxa-runner.js';
import { print, printError } from '../output.js';
import { extractUuid, readStdin, isStdinMarker } from '../utils.js';

/**
 * Parse cell values from comma-separated string or JSON array
 */
function parseCells(cellsArg) {
  if (!cellsArg) return null;

  // Try JSON array first
  if (cellsArg.startsWith('[')) {
    try {
      return JSON.parse(cellsArg);
    } catch (e) {
      // Fall through to CSV parsing
    }
  }

  // Parse as comma-separated (basic - doesn't handle quoted commas)
  return cellsArg.split(',').map(c => c.trim());
}

/**
 * Format sheet data for display
 */
function formatSheetOutput(result, options) {
  if (options.json || options.pretty) {
    return result;
  }

  if (options.csv) {
    // Output as CSV
    const lines = [];
    // Header row
    lines.push(result.columns.map(c => c.name).join(','));
    // Data rows
    for (const row of result.cells) {
      lines.push(row.map(cell => {
        // Quote cells containing commas or quotes
        if (cell.includes(',') || cell.includes('"')) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      }).join(','));
    }
    return lines.join('\n');
  }

  if (options.tsv) {
    // Output as TSV
    const lines = [];
    lines.push(result.columns.map(c => c.name).join('\t'));
    for (const row of result.cells) {
      lines.push(row.join('\t'));
    }
    return lines.join('\n');
  }

  // Default: return as-is for JSON output
  return result;
}

export function registerSheetCommand(program) {
  const sheet = program
    .command('sheet')
    .description('Manage CSV/TSV sheet records');

  // Get sheet data
  sheet
    .command('get <uuid>')
    .description('Get sheet data (columns and cells)')
    .option('--csv', 'Output as CSV')
    .option('--tsv', 'Output as TSV')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output cell data')
    .addHelpText('after', `
Examples:
  dt sheet get UUID
  dt sheet get UUID --csv
  dt sheet get UUID --tsv
  dt sheet get x-devonthink-item://UUID
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const cleanUuid = extractUuid(uuid);
        const result = await runJxa('read', 'sheetGet', [JSON.stringify({ uuid: cleanUuid })]);

        if (!result.success) {
          printError(new Error(result.error), options);
          process.exit(1);
        }

        if (options.csv || options.tsv) {
          console.log(formatSheetOutput(result, options));
        } else {
          print(result, options);
        }
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // Get specific cell
  sheet
    .command('get-cell <uuid>')
    .description('Get a specific cell value')
    .requiredOption('-c, --column <column>', 'Column (1-based index or name)')
    .requiredOption('-r, --row <row>', 'Row (1-based index)')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output cell value')
    .addHelpText('after', `
Examples:
  dt sheet get-cell UUID -c 1 -r 1
  dt sheet get-cell UUID -c "Name" -r 2
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const cleanUuid = extractUuid(uuid);

        // First get the sheet to access cell
        const result = await runJxa('read', 'sheetGet', [JSON.stringify({ uuid: cleanUuid })]);

        if (!result.success) {
          printError(new Error(result.error), options);
          process.exit(1);
        }

        const row = parseInt(options.row, 10);
        let colIndex;

        // Resolve column to index
        if (/^\d+$/.test(options.column)) {
          colIndex = parseInt(options.column, 10) - 1;
        } else {
          // Find by name
          colIndex = result.columns.findIndex(c => c.name === options.column);
          if (colIndex === -1) {
            throw new Error(`Column "${options.column}" not found`);
          }
        }

        if (row < 1 || row > result.cells.length) {
          throw new Error(`Row ${row} out of range (1-${result.cells.length})`);
        }

        if (colIndex < 0 || colIndex >= result.columns.length) {
          throw new Error(`Column out of range (1-${result.columns.length})`);
        }

        const cellValue = result.cells[row - 1][colIndex];

        if (options.quiet) {
          console.log(cellValue);
        } else {
          print({
            success: true,
            uuid: cleanUuid,
            column: options.column,
            row: row,
            value: cellValue
          }, options);
        }
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // Set cell value
  sheet
    .command('set-cell <uuid>')
    .description('Set a specific cell value')
    .requiredOption('-c, --column <column>', 'Column (1-based index or name)')
    .requiredOption('-r, --row <row>', 'Row (1-based index)')
    .requiredOption('--value <value>', 'New cell value')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Minimal output')
    .addHelpText('after', `
Examples:
  dt sheet set-cell UUID -c 1 -r 1 -v "New Value"
  dt sheet set-cell UUID -c "Name" -r 2 -v "John Doe"
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const cleanUuid = extractUuid(uuid);
        const column = /^\d+$/.test(options.column)
          ? parseInt(options.column, 10)
          : options.column;

        const result = await runJxa('write', 'sheetSetCell', [JSON.stringify({
          uuid: cleanUuid,
          column: column,
          row: parseInt(options.row, 10),
          value: options.value
        })]);

        print(result, options);

        if (!result.success) {
          process.exit(1);
        }
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // Add row
  sheet
    .command('add-row <uuid>')
    .description('Add a row to the sheet')
    .requiredOption('--cells <cells>', 'Cell values (comma-separated or JSON array)')
    .option('-p, --position <position>', 'Insert at position (1-based, default: end)')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Minimal output')
    .addHelpText('after', `
Examples:
  dt sheet add-row UUID --cells "Value1,Value2,Value3"
  dt sheet add-row UUID --cells '["Val1","Val2","Val3"]'
  dt sheet add-row UUID --cells "A,B,C" -p 1  # Insert at beginning
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const cleanUuid = extractUuid(uuid);
        const cells = parseCells(options.cells);

        if (!cells || cells.length === 0) {
          throw new Error('--cells is required and must not be empty');
        }

        const params = {
          uuid: cleanUuid,
          cells: cells
        };

        if (options.position) {
          params.position = parseInt(options.position, 10);
        }

        const result = await runJxa('write', 'sheetAddRow', [JSON.stringify(params)]);
        print(result, options);

        if (!result.success) {
          process.exit(1);
        }
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // Delete row
  sheet
    .command('delete-row <uuid>')
    .description('Delete a row from the sheet')
    .requiredOption('-p, --position <position>', 'Row position to delete (1-based)')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Minimal output')
    .addHelpText('after', `
Examples:
  dt sheet delete-row UUID -p 3
  dt sheet delete-row UUID --position 1  # Delete first row
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const cleanUuid = extractUuid(uuid);
        const position = parseInt(options.position, 10);

        if (isNaN(position) || position < 1) {
          throw new Error('--position must be a positive integer');
        }

        const result = await runJxa('write', 'sheetDeleteRow', [JSON.stringify({
          uuid: cleanUuid,
          position: position
        })]);

        print(result, options);

        if (!result.success) {
          process.exit(1);
        }
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // Set all rows (bulk replace)
  sheet
    .command('set-rows <uuid>')
    .description('Replace all rows in the sheet')
    .option('--cells <cells>', 'Cell data as JSON 2D array')
    .option('--stdin', 'Read cell data from stdin (JSON or CSV)')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Minimal output')
    .addHelpText('after', `
Examples:
  dt sheet set-rows UUID --cells '[["A","B"],["C","D"]]'
  cat data.json | dt sheet set-rows UUID --stdin
  cat data.csv | dt sheet set-rows UUID --stdin
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const cleanUuid = extractUuid(uuid);
        let cells;

        if (options.stdin) {
          const input = await readStdin();

          // Try JSON first
          try {
            cells = JSON.parse(input);
          } catch (e) {
            // Parse as CSV
            cells = input.trim().split('\n').map(line => {
              // Simple CSV parsing (doesn't handle quoted fields with commas)
              return line.split(',').map(c => c.trim());
            });
          }
        } else if (options.cells) {
          cells = JSON.parse(options.cells);
        } else {
          throw new Error('Either --cells or --stdin is required');
        }

        if (!Array.isArray(cells) || cells.length === 0) {
          throw new Error('cells must be a non-empty 2D array');
        }

        const result = await runJxa('write', 'sheetSetRows', [JSON.stringify({
          uuid: cleanUuid,
          cells: cells
        })]);

        print(result, options);

        if (!result.success) {
          process.exit(1);
        }
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });
}
