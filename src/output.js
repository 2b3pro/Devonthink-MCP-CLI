/**
 * Output Formatting
 * Handles JSON, table, and pretty-printed output
 */

/**
 * Format output based on options
 * @param {object} data - Data to output
 * @param {object} options - Formatting options
 * @param {boolean} options.json - Output raw JSON
 * @param {boolean} options.pretty - Pretty print JSON
 * @param {boolean} options.quiet - Minimal output
 * @returns {string} Formatted output
 */
export function formatOutput(data, options = {}) {
  const { json, pretty, quiet } = options;

  // Quiet mode - just output essential info
  if (quiet) {
    if (data.uuid) return data.uuid;
    if (data.success === false) return '';
    if (Array.isArray(data.results)) {
      return data.results.map(r => r.uuid).join('\n');
    }
    return '';
  }

  // JSON output (default)
  if (json || pretty) {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  // Default: pretty JSON
  return JSON.stringify(data, null, 2);
}

/**
 * Print output to stdout
 * @param {object} data - Data to output
 * @param {object} options - Formatting options
 */
export function print(data, options = {}) {
  const output = formatOutput(data, options);
  if (output) {
    console.log(output);
  }
}

/**
 * Print error to stderr
 * @param {string|Error} error - Error to print
 * @param {object} options - Formatting options
 */
export function printError(error, options = {}) {
  const message = error instanceof Error ? error.message : error;

  if (options.json || options.pretty) {
    console.error(JSON.stringify({ success: false, error: message }, null, options.pretty ? 2 : 0));
  } else {
    console.error(`Error: ${message}`);
  }
}

/**
 * Format a list of records for display
 * @param {Array} records - Array of record objects
 * @param {object} options - Formatting options
 * @returns {string} Formatted output
 */
export function formatRecordList(records, options = {}) {
  if (!records || records.length === 0) {
    return 'No records found.';
  }

  if (options.json || options.pretty) {
    return JSON.stringify(records, null, options.pretty ? 2 : 0);
  }

  // Simple list format
  return records.map(r => {
    const tags = r.tags?.length ? ` [${r.tags.join(', ')}]` : '';
    return `${r.uuid}  ${r.name}${tags}`;
  }).join('\n');
}

/**
 * Format record properties for display
 * @param {object} record - Record object
 * @param {object} options - Formatting options
 * @returns {string} Formatted output
 */
export function formatRecordProperties(record, options = {}) {
  if (options.json || options.pretty) {
    return JSON.stringify(record, null, options.pretty ? 2 : 0);
  }

  // Key-value format
  const lines = [];
  const fields = [
    ['UUID', 'uuid'],
    ['Name', 'name'],
    ['Type', 'recordType'],
    ['Database', 'database'],
    ['Location', 'location'],
    ['Path', 'path'],
    ['Tags', 'tags'],
    ['Comment', 'comment'],
    ['Created', 'creationDate'],
    ['Modified', 'modificationDate'],
    ['Size', 'size'],
    ['Words', 'wordCount'],
  ];

  for (const [label, key] of fields) {
    if (record[key] !== undefined && record[key] !== null) {
      let value = record[key];
      if (Array.isArray(value)) {
        value = value.join(', ') || '(none)';
      }
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join('\n');
}
