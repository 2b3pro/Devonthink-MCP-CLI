#!/usr/bin/env osascript -l JavaScript
// Get currently selected record(s) in DEVONthink
// USE WHEN user says "with the selected item(s)/record(s) in DEVONthink"
// Usage: osascript -l JavaScript getSelection.js
// Returns: JSON array of selected records with key properties

ObjC.import("Foundation");

const app = Application("DEVONthink");
const selection = app.selectedRecords();

if (selection.length === 0) {
  JSON.stringify({
    success: false,
    error: "No records selected in DEVONthink",
    hint: "Select one or more items in DEVONthink and try again"
  });
} else {
  const records = selection.map(record => {
    try {
      return {
        // Identity
        uuid: record.uuid(),
        name: record.name(),

        // Location
        path: record.path(),
        location: record.location(),
        database: record.database().name(),

        // Type
        type: record.type(),
        kind: record.kind(),

        // Metadata
        tags: record.tags(),
        comment: record.comment(),

        // Dates
        creationDate: record.creationDate() ? record.creationDate().toString() : null,
        modificationDate: record.modificationDate() ? record.modificationDate().toString() : null,

        // Size
        size: record.size(),
        wordCount: record.wordCount()
      };
    } catch (e) {
      return {
        uuid: record.uuid(),
        name: record.name(),
        error: e.message
      };
    }
  });

  JSON.stringify({
    success: true,
    count: records.length,
    records: records
  }, null, 2);
}
