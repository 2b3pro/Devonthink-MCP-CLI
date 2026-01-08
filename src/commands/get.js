/**
 * Get Command
 * Get record properties, preview, or content
 * @version 1.0.0
 * @tested 2026-01-05
 */

import { runJxa, requireDevonthink } from '../jxa-runner.js';
import { print, printError } from '../output.js';
import { trackRecordAccess } from '../state.js';

function collectTags(value, previous) {
  return previous.concat([value]);
}

export function registerGetCommand(program) {
  const get = program
    .command('get')
    .description('Get record information');

  // dt get props <uuid>
  get
    .command('props <uuid>')
    .alias('properties')
    .description('Get all properties of a record')
    .option('--fields <fields>', 'Comma-separated list of properties to return')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output UUID')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "name": "string",
    "recordType": "string",
    "database": "string",
    "location": "string",
    "path": "string",
    "...": "all other record properties"
  }

Available properties by category:

  Identity:
    uuid, name, filename, original name, id, database, path, location

  Content & Type:
    kind, type, record type, MIME type, plain text, rich text, source, url,
    reference URL, web archive, formatted note, markdown source

  Dates:
    creation date, modification date, addition date, opening date,
    document date, all document dates

  Organization & Metadata:
    tags, aliases, label, rating, comment, custom metadata,
    annotation, attached script

  Status & Flags:
    flag, flagged, unread, state, locked, locking, pending, indexed, encrypted

  Metrics:
    size, word count, character count, page count, duration, width, height,
    dpi, score, dimensions

  Exclusions:
    exclude from search, exclude from classification, exclude from see also,
    exclude from tagging, exclude from Wiki linking, exclude from chat

  Counts:
    annotation count, attachment count, number of duplicates,
    number of replicants, number of hits

Field keys (for --fields):
  additionDate, aliases, altitude, annotationCount, attachmentCount, batesNumber,
  characterCount, comment, creationDate, database, doi, dpi, duration, encrypted,
  excludeFromChat, excludeFromClassification, excludeFromSearch, excludeFromSeeAlso,
  excludeFromTagging, excludeFromWikiLinking, filename, flag, height, id, indexed,
  isbn, kind, label, latitude, location, locationWithName, locked, longitude, mimeType,
  modificationDate, name, numberOfDuplicates, numberOfReplicants, openingDate,
  pageCount, parentName, parentPath, parentUuid, path, pending, rating,
  recordType, score, size, state, tags, unread, url, uuid, width, wordCount
`)
    .addHelpText('after', `
Examples:
  dt get props ABCD-1234
  dt get props x-devonthink-item://ABCD-1234 --json
  dt get props ABCD-1234 --fields "uuid,name,recordType"
`)
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
            // databaseUuid not returned by getRecordProperties yet
          }).catch(() => {});
        }

        print(result, options);
        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get filepath <uuid>
  get
    .command('filepath <uuid>')
    .alias('file')
    .description('Get the filesystem path of a record')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "path": "string"
  }

Examples:
  dt get filepath ABCD-1234
  open "$(dt get filepath ABCD-1234)"
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();
        const result = await runJxa('read', 'getRecordPath', [uuid, 'filepath']);

        if (result.success && !options.json && !options.pretty) {
          // Default: just output the path
          console.log(result.path || '');
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get dbpath <uuid>
  get
    .command('dbpath <uuid>')
    .alias('location')
    .description('Get the database location path of a record')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "location": "string",
    "database": "string"
  }

Examples:
  dt get dbpath ABCD-1234
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();
        const result = await runJxa('read', 'getRecordPath', [uuid, 'dbpath']);

        if (result.success && !options.json && !options.pretty) {
          // Default: output database:location format
          console.log(`${result.database}:${result.location}`);
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get preview <uuid>
  get
    .command('preview <uuid>')
    .alias('content')
    .description('Get plain text preview of a record')
    .option('-l, --length <chars>', 'Maximum characters to return', '3000')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output the preview text')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "name": "string",
    "recordType": "string",
    "preview": "string",
    "length": number
  }

Examples:
  dt get preview ABCD-1234
  dt get preview ABCD-1234 -l 500 --quiet
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();
        const maxChars = options.length || '3000';
        const result = await runJxa('read', 'getRecordPreview', [uuid, maxChars]);

        if (result.success) {
          await trackRecordAccess({
            uuid: result.uuid,
            name: result.name,
            type: result.recordType,
            // database info not returned
          }).catch(() => {});
        }

        if (options.quiet && result.success) {
          console.log(result.preview || '');
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get selection
  get
    .command('selection')
    .alias('selected')
    .description('Get currently selected records in DEVONthink')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output UUIDs')
    .addHelpText('after', `
JSON Output:
  [
    {
      "uuid": "string",
      "name": "string",
      "recordType": "string",
      "database": "string",
      "location": "string"
    }
  ]

Examples:
  dt get selection
  dt get selection --quiet
`)
    .action(async (options) => {
      try {
        await requireDevonthink();
        const result = await runJxa('read', 'getSelection', []);
        print(result, options);
        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get concordance <uuid>
  get
    .command('concordance <uuid>')
    .alias('words')
    .description('Get word list (concordance) of a record')
    .option('-s, --sort <method>', 'Sort by: weight (default), frequency, name', 'weight')
    .option('-l, --limit <n>', 'Limit number of words returned', parseInt)
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output words (one per line)')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "name": "string",
    "wordCount": number,
    "words": ["string"],
    "concordance": [
      { "word": "string", "frequency": number, "weight": number }
    ]
  }

Examples:
  dt get concordance ABCD-1234
  dt get concordance ABCD-1234 --sort frequency --limit 25
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();
        const sortBy = options.sort || 'weight';
        const result = await runJxa('read', 'getConcordance', [uuid, sortBy]);

        if (options.limit && result.success && result.words) {
          result.words = result.words.slice(0, options.limit);
          result.wordCount = result.words.length;
        }

        if (options.quiet && result.success) {
          // Output just the words, one per line
          console.log(result.words.join('\n'));
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get metadata <uuid> <field>
  get
    .command('metadata <uuid> <field>')
    .description('Get a specific custom metadata field value')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output the value')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "field": "string",
    "value": "any"
  }

Examples:
  dt get metadata ABCD-1234 author
  dt get metadata ABCD-1234 reviewer --quiet
`)
    .action(async (uuid, field, options) => {
      try {
        await requireDevonthink();
        const params = { uuid, field };
        const result = await runJxa('read', 'getCustomMetadata', [JSON.stringify(params)]);

        if (options.quiet && result.success) {
          console.log(result.value ?? '');
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get metadata-list <uuid>
  get
    .command('metadata-list <uuid>')
    .alias('metadata-all')
    .description('List all custom metadata fields for a record')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output field names (one per line)')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "metadata": [
      { "field": "string", "value": "any" }
    ]
  }

Examples:
  dt get metadata-list ABCD-1234
  dt get metadata-list ABCD-1234 --quiet
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();
        const params = { uuid, all: true };
        const result = await runJxa('read', 'getCustomMetadata', [JSON.stringify(params)]);

        if (options.quiet && result.success) {
          console.log(result.metadata.map(m => m.field).join('\n'));
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get transcribe <uuid>
  get
    .command('transcribe <uuid>')
    .alias('transcript')
    .description('Transcribe speech/text from audio, video, PDF, or image')
    .option('-l, --language <code>', 'ISO language code (e.g., en, de)')
    .option('--timestamps', 'Include timestamps in transcription')
    .option('--no-timestamps', 'Exclude timestamps from transcription')
    .option('-a, --ai-cleanup', 'Use AI to clean up transcription (fix grammar, formatting)')
    .option('--ai-prompt <prompt>', 'Custom AI prompt for cleanup (implies --ai-cleanup)')
    .option('--no-raw', 'Exclude raw transcription from output when using AI cleanup')
    .option('-s, --save', 'Save transcription as a markdown document')
    .option('-d, --database <name>', 'Target database for saved document (default: source record\'s database)')
    .option('-g, --group <path>', 'Destination group path or UUID (default: source record\'s location)')
    .option('-n, --name <name>', 'Document name (default: "Original Name - Transcription")')
    .option('-t, --tag <tag>', 'Add tag to saved document (repeatable)', collectTags, [])
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output the transcription text')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "transcription": "string",
    "raw": "string", // optional
    "savedUuid": "string" // optional
  }

Examples:
  dt get transcribe ABCD-1234 --language en
  dt get transcribe ABCD-1234 --ai-cleanup --save -d "Inbox"
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        const params = { uuid };
        if (options.language) params.language = options.language;
        if (options.timestamps !== undefined) params.timestamps = options.timestamps;

        // AI cleanup options
        if (options.aiCleanup || options.aiPrompt) {
          params.aiCleanup = true;
          if (options.aiPrompt) params.aiPrompt = options.aiPrompt;
          if (options.raw === false) params.includeRaw = false;
        }

        // Save options
        if (options.save) {
          params.save = true;
          if (options.database) params.database = options.database;
          if (options.group) params.groupPath = options.group;
          if (options.name) params.docName = options.name;
          if (options.tag && options.tag.length > 0) params.tags = options.tag;
        }

        const result = await runJxa('read', 'transcribe', [JSON.stringify(params)]);

        if (options.quiet && result.success) {
          console.log(result.transcription || '');
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });

  // dt get related <uuid>
  get
    .command('related <uuid>')
    .alias('links')
    .description('Get related records (backlinks, wikilinks, AI suggestions, or classification)')
    .option('-t, --type <type>', 'Type of relation: incoming, outgoing, similar, all', 'all')
    .option('--by-data', 'Find related by data comparison (text & metadata)')
    .option('--by-tags', 'Find related by tags comparison')
    .option('-d, --database <name>', 'Limit classification scope to database')
    .option('-l, --limit <n>', 'Limit number of results', parseInt, 20)
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Only output UUIDs')
    .addHelpText('after', `
JSON Output:
  {
    "success": true,
    "uuid": "string",
    "relations": [
      {
        "uuid": "string",
        "name": "string",
        "type": "string",
        "database": "string",
        "score": number
      }
    ]
  }

Examples:
  dt get related ABCD-1234
  dt get related ABCD-1234 --by-tags -l 10
`)
    .action(async (uuid, options) => {
      try {
        await requireDevonthink();

        // Determine type based on flags
        let type = options.type;
        if (options.byData) type = 'byData';
        if (options.byTags) type = 'byTags';

        const params = {
          uuid,
          type,
          limit: options.limit
        };

        if (options.database) params.database = options.database;

        const result = await runJxa('read', 'getRelated', [JSON.stringify(params)]);

        if (options.quiet && result.success) {
          console.log(result.relations.map(r => r.uuid).join('\n'));
        } else {
          print(result, options);
        }

        if (!result.success) process.exit(1);
      } catch (error) {
        printError(error, options);
        process.exit(1);
      }
    });
}
