# DEVONthink Search Cheatsheet (dt CLI + MCP)

This CLI forwards your query string directly to DEVONthink's search engine.
Use DEVONthink search syntax for full-text + metadata queries.

## Basics

- Case-insensitive search
- Phrases: use quotes, e.g. "project plan"
- Wildcards: `?` = any single char, `*` = any sequence
- Boolean: `AND`, `OR`, `NOT` (use parentheses to group)
- Proximity: `NEAR`, `BEFORE`, `AFTER`

## Search Prefixes (metadata filters)

Search prefixes target metadata fields. A few common examples:

- `rating:2` or `rating:3-5`
- `created:2024-06-15`
- `created:>2 weeks`
- `flag:unflagged`
- `tags:Funny`
- `kind:rtf`
- `size:<=20 MB`

DEVONthink supports many more prefixes and operators. See the DEVONthink
appendix for the complete list.

## Operators

Use operators with prefixes to compare or define ranges:

- `=` (equal), `!=` (not equal)
- `>` `>=` `<` `<=` (greater/less than)
- Range: `rating:3-5`

## Time Period Examples

- Records created in the last 2 weeks:
  `created:>2 weeks`
- Modified since a date:
  `modified:>=2024-01-01`
- Created within a range:
  `created:2024-01-01-2024-03-31`

## CLI Examples

```bash
# Simple text search
DT=dt
$DT search query "project plan"

# Time window + tag
$DT search query 'created:>2 weeks AND tags:client'

# Time window via first-class flags (auto-builds query)
$DT search query 'client' --created-after "2 weeks" --modified-before "2024-12-31"

# Type filter (recordType) with a normal query
$DT search query 'created:>=2024-01-01 AND tags:research' --type markdown

# Scope
$DT search query 'tags:Funny' -d "My Database" -g "GROUP-UUID" --exclude-subgroups
```

## CLI Time Flags

- `--created-after <value>`
- `--created-before <value>`
- `--modified-after <value>`
- `--modified-before <value>`
- `--added-after <value>`
- `--added-before <value>`

Values can be absolute dates (e.g. `2024-01-01`) or relative expressions
(e.g. `2 weeks`) supported by DEVONthink.

## MCP Example

```json
{
  "tool": "search_records",
  "query": "tags:client",
  "createdAfter": "2 weeks",
  "database": "My Database",
  "limit": 20
}
```

## Notes

- CLI options like `--database`, `--group`, `--exclude-subgroups`, and
  `--comparison` scope the search in addition to the query string.
- The query string is passed as-is to DEVONthink, so you can combine
  full-text, boolean logic, prefixes, and ranges in one expression.
- If you want only date filters, use a wildcard base query, e.g. `*`.
