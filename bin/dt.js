#!/usr/bin/env node

/**
 * DEVONthink CLI Entry Point
 *
 * A unified command-line interface for DEVONthink 4 on macOS.
 *
 * Usage:
 *   dt search "query" --database "MyDB"
 *   dt get props <uuid>
 *   dt create --name "Note" --type markdown --database "Inbox"
 *   dt list inbox
 *
 * Run `dt --help` for full command list.
 */

import { createProgram } from '../src/index.js';

// Check platform
if (process.platform !== 'darwin') {
  console.error('Error: DEVONthink CLI only works on macOS.');
  process.exit(1);
}

// Create and run program
const program = createProgram();

// Handle errors gracefully
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
    // Commander already printed the error
    process.exit(1);
  }
  if (err.code === 'DEVONTHINK_NOT_RUNNING') {
    console.error(err.message);
    process.exit(1);
  }
  // Unexpected error
  console.error('Error:', err.message);
  process.exit(1);
}
