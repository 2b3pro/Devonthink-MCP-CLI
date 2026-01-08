#!/usr/bin/env osascript -l JavaScript
// Get all properties of a DEVONthink record
// Usage: osascript -l JavaScript getRecordProperties.js <uuid> [fields]

ObjC.import("Foundation");

function getProperty(record, propName, isFunction = true) {
  try {
    let value = isFunction ? record[propName]() : record[propName];
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  } catch (e) {
    return `Error getting property ${propName}: ${e.message}`;
  }
}

function getParentGroup(app, record) {
  try {
    if (record.locationGroup) {
      const group = record.locationGroup();
      if (group) return group;
    }
  } catch (e) {}

  try {
    const location = record.location ? record.location() : null;
    if (!location) return null;
    const database = record.database ? record.database() : app.currentDatabase();
    return resolveGroup(app, location, database);
  } catch (e) {
    return null;
  }
}

function prefixDatabasePath(dbName, value) {
  if (!value || !dbName) return value || null;
  const trimmed = String(value).replace(/\/+$/, '');
  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (!normalized) return dbName;
  if (normalized === dbName || normalized.startsWith(dbName + "/")) return normalized;
  return dbName + "/" + normalized;
}

const uuidArg = getArg(4, null);
const fieldsArg = getArg(5, null);

let uuid = null;
let fields = null;

if (uuidArg && uuidArg.trim().startsWith('{')) {
  try {
    const parsed = JSON.parse(uuidArg);
    uuid = parsed.uuid || null;
    fields = Array.isArray(parsed.fields) ? parsed.fields : null;
  } catch (e) {
    uuid = uuidArg;
  }
} else {
  uuid = uuidArg;
}

if (fieldsArg) {
  const trimmed = fieldsArg.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(fieldsArg);
      fields = Array.isArray(parsed.fields) ? parsed.fields : (Array.isArray(parsed) ? parsed : fields);
    } catch (e) {
      fields = fieldsArg.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else {
    fields = fieldsArg.split(',').map(s => s.trim()).filter(Boolean);
  }
}

if (!uuid) {
  JSON.stringify({ success: false, error: "Usage: getRecordProperties.js <uuid>" });
} else {
  const app = Application("DEVONthink");
  const cleanUuid = extractUuid(uuid);
  const record = app.getRecordWithUuid(cleanUuid);

  if (!record) {
    JSON.stringify({ success: false, error: "Record not found: " + cleanUuid });
  } else {
    const parentGroup = getParentGroup(app, record);
    const parentLocation = getProperty(record, 'location');
    const databaseName = getProperty(record, 'database') ? record.database().name() : null;
    const locationWithName = getProperty(record, 'locationWithName');
    const locationValue = locationWithName || parentLocation;
    const props = {
      success: true,
      // Identity
      id: getProperty(record, 'id'),
      uuid: getProperty(record, 'uuid'),
      name: getProperty(record, 'name'),
      filename: getProperty(record, 'filename'),
      
      // Location
      path: getProperty(record, 'path'),
      location: prefixDatabasePath(databaseName, locationValue),
      locationWithName: prefixDatabasePath(databaseName, locationWithName),
      database: databaseName || 'N/A',
      parentUuid: parentGroup && parentGroup.uuid ? parentGroup.uuid() : null,
      parentName: parentGroup && parentGroup.name ? parentGroup.name() : null,
      parentPath: prefixDatabasePath(
        databaseName,
        parentGroup && parentGroup.path ? (parentGroup.path() || parentLocation) : parentLocation
      ),
      
      // Type & Content Info
      recordType: getProperty(record, 'recordType'),
      kind: getProperty(record, 'kind'),
      mimeType: getProperty(record, 'mimeType'),
      
      // Dates
      creationDate: getProperty(record, 'creationDate'),
      modificationDate: getProperty(record, 'modificationDate'),
      additionDate: getProperty(record, 'additionDate'),
      openingDate: getProperty(record, 'openingDate'),
      
      // Size & Metrics
      size: getProperty(record, 'size'),
      wordCount: getProperty(record, 'wordCount'),
      characterCount: getProperty(record, 'characterCount'),
      pageCount: getProperty(record, 'pageCount'),
      duration: getProperty(record, 'duration'),
      width: getProperty(record, 'width'),
      height: getProperty(record, 'height'),
      dpi: getProperty(record, 'dpi'),
      
      // Metadata
      tags: getProperty(record, 'tags'),
      comment: getProperty(record, 'comment'),
      url: getProperty(record, 'url'),
      aliases: getProperty(record, 'aliases'),
      rating: getProperty(record, 'rating'),
      label: getProperty(record, 'label'),
      
      // Flags & State
      flag: getProperty(record, 'flag'),
      unread: getProperty(record, 'unread'),
      locked: getProperty(record, 'locking'),
      indexed: getProperty(record, 'indexed'),
      pending: getProperty(record, 'pending'),
      encrypted: getProperty(record, 'encrypted'),
      score: getProperty(record, 'score'),
      state: getProperty(record, 'state'),
      
      // Exclusions
      excludeFromSearch: getProperty(record, 'excludeFromSearch'),
      excludeFromClassification: getProperty(record, 'excludeFromClassification'),
      excludeFromSeeAlso: getProperty(record, 'excludeFromSeeAlso'),
      excludeFromTagging: getProperty(record, 'excludeFromTagging'),
      excludeFromWikiLinking: getProperty(record, 'excludeFromWikiLinking'),
      excludeFromChat: getProperty(record, 'excludeFromChat'),

      // Counts
      numberOfDuplicates: getProperty(record, 'numberOfDuplicates'),
      numberOfReplicants: getProperty(record, 'numberOfReplicants'),
      annotationCount: getProperty(record, 'annotationCount'),
      attachmentCount: getProperty(record, 'attachmentCount')
    };

    // Optional properties
    props.latitude = getProperty(record, 'latitude');
    props.longitude = getProperty(record, 'longitude');
    props.altitude = getProperty(record, 'altitude');
    props.batesNumber = getProperty(record, 'batesNumber');
    props.doi = getProperty(record, 'digitalObjectIdentifier');
    props.isbn = getProperty(record, 'isbn');

    if (fields && fields.length > 0) {
      const filtered = { success: true };
      fields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(props, field)) {
          filtered[field] = props[field];
        } else {
          filtered[field] = null;
        }
      });
      JSON.stringify(filtered, null, 2);
    } else {
      JSON.stringify(props, null, 2);
    }
  }
}
