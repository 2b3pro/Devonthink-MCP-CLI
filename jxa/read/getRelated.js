#!/usr/bin/env osascript -l JavaScript
// Get related records (incoming links, outgoing links, AI-suggested similar, or classification-based)
// Usage: osascript -l JavaScript getRelated.js '<json>'
// JSON format: {"uuid":"...", "type":"incoming|outgoing|similar|byData|byTags|all", "limit":10, "database":"..."}
// Returns: { success: true, relations: [ { uuid, name, type, ... } ] }

ObjC.import("Foundation");

const jsonArg = getArg(4, null);

if (!jsonArg) {
  JSON.stringify({ success: false, error: "Missing arguments" });
} else {
  try {
    const params = JSON.parse(jsonArg);
    const uuid = extractUuid(params.uuid);
    const type = params.type || "all";
    const limit = params.limit || 50;
    const databaseRef = params.database || null;

    if (!uuid) throw new Error("Missing UUID");

    const app = Application("DEVONthink");
    const record = app.getRecordWithUuid(uuid);

    if (!record) throw new Error("Record not found: " + uuid);

    // Get optional database for scoping classify
    let targetDb = null;
    if (databaseRef) {
      targetDb = getDatabase(app, databaseRef);
    }

    let results = [];

    // Batch-format a list of records using element specifiers
    // 5 Apple Events total instead of 5*N per-item calls
    function batchFormat(recs, relationType, scoresFn) {
      const count = recs.length;
      if (count === 0) return;

      const recUuids = recs.uuid();
      const recNames = recs.name();
      const recLocs = recs.location();
      const recPaths = recs.path();
      // database().name() can't be batched in one call — resolve per item
      // but we can batch database() first, then name()
      const recDbs = recs.database();

      const sourceUuid = record.uuid();

      for (let i = 0; i < count; i++) {
        if (recUuids[i] === sourceUuid) continue; // exclude self
        results.push({
          uuid: recUuids[i],
          name: recNames[i],
          database: recDbs[i].name(),
          location: recLocs[i],
          relation: relationType,
          score: scoresFn ? scoresFn(i, count) : null,
          path: recPaths[i]
        });
      }
    }

    // 1. Incoming References (Backlinks)
    if (type === "incoming" || type === "all") {
      const incoming = record.incomingReferences;
      if (incoming.length > 0) {
        batchFormat(incoming, "incoming", null);
      }
    }

    // 2. Outgoing References (Wiki Links / Citations)
    if (type === "outgoing" || type === "all") {
      const outgoing = record.outgoingReferences;
      if (outgoing.length > 0) {
        batchFormat(outgoing, "outgoing", null);
      }
    }

    // 3. Similar Records (AI "See Also")
    if (type === "similar" || type === "all") {
      const similar = app.compare(record);
      if (similar.length > 0) {
        batchFormat(similar, "similar", function(i, count) {
          return (count - i) / count; // Mock normalized score by rank
        });
      }
    }

    // 4. Classification by Data (text & metadata comparison)
    if (type === "byData") {
      const classifyOpts = { record: record, comparison: "data comparison" };
      if (targetDb) classifyOpts.in = targetDb;
      const proposals = app.classify(classifyOpts);
      if (proposals.length > 0) {
        batchFormat(proposals, "byData", function(i, count) {
          return (count - i) / count;
        });
      }
    }

    // 5. Classification by Tags
    if (type === "byTags") {
      const classifyOpts = { record: record, comparison: "tags comparison" };
      if (targetDb) classifyOpts.in = targetDb;
      const proposals = app.classify(classifyOpts);
      if (proposals.length > 0) {
        batchFormat(proposals, "byTags", function(i, count) {
          return (count - i) / count;
        });
      }
    }

    // Deduplicate if "all" (a record could be both linked and similar)
    if (type === "all") {
        const seen = new Set();
        results = results.filter(r => {
            const key = r.uuid + r.relation;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Apply limit per category or overall? 
    // If specific type is requested, limit applies to it.
    // If "all", maybe limit total? Let's limit total for safety.
    if (results.length > limit) {
        results = results.slice(0, limit);
    }

    JSON.stringify({
      success: true,
      source: {
        uuid: record.uuid(),
        name: record.name()
      },
      relations: results,
      count: results.length
    }, null, 2);

  } catch (e) {
    JSON.stringify({ success: false, error: e.message });
  }
}
