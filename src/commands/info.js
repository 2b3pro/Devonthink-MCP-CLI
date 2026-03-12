/**
 * Info Command
 * Convenience alias for `dt get props <uuid>`
 * @version 1.0.0
 */

import { runJxa, requireDevonthink } from '../jxa-runner.js';
import { print, printError } from '../output.js';
import { trackRecordAccess } from '../state.js';

export function registerInfoCommand(program) {
  program
    .command('info <uuid>')
    .description('Get record properties (alias for "get props")')
    .option('--fields <fields>', 'Comma-separated list of properties to return')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output UUID')
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();
        const fields = options.fields
          ? options.fields.split(',').map(field => field.trim()).filter(Boolean)
          : null;
        const args = [uuid];
        if (fields && fields.length > 0) {
          args.push(JSON.stringify({ fields }));
        }
        const result = await runJxa('read', 'getRecordProperties', args);

        if (result.success && result.uuid) {
          await trackRecordAccess({
            uuid: result.uuid,
            name: result.name,
            type: result.kind || result.recordType,
            databaseName: result.database,
          }).catch(() => {});
        }

        print(result, options);
        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });
}
