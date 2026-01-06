# DEVONthink Model Context Protocol (MCP) Server

This CLI includes a built-in **MCP Server** that enables AI assistants (like **Claude Desktop**) to directly search, read, and navigate your DEVONthink databases.

## What is this?
The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open standard that allows AI models to connect to your local data. By running `dt mcp run`, you turn DEVONthink into a "knowledge provider" for your AI.

**Capabilities exposed to Claude:**
- **Search:** Full-text and metadata search of your databases.
- **Read:** Retrieve the plain text content of any record.
- **Navigate:** Follow "See Also" suggestions, Wiki Links, and Backlinks to traverse your knowledge graph.
- **Explore:** List contents of groups and folders.

## Setup for Claude Desktop

1. **Get your config snippet:**
   Run the following command in your terminal:
   ```bash
   dt mcp config
   ```
   This will output a JSON snippet tailored to your specific installation path.

2. **Edit Claude's Config:**
   Open (or create) the configuration file at:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

3. **Paste the Config:**
   Add the snippet inside the `mcpServers` object. It should look something like this:

   ```json
   {
     "mcpServers": {
       "devonthink": {
         "command": "node",
         "args": [
           "/usr/local/bin/dt",
           "mcp",
           "run"
         ],
         "env": {
           "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
           "DT_ORGANIZE_PROMPT": "YOUR-SOP-RECORD-UUID-HERE"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop:**
   Quit and restart the Claude app. You should see a generic "hammer/tool" icon or indicator that the `devonthink` server is connected.

## Usage Examples

Once connected, you can ask Claude natural language questions that require access to your files:

> "Search my DEVONthink for notes about 'Machine Learning' and summarize the top 3 results."

> "Find the document 'Project Alpha' and tell me what other documents link to it."

> "Read my 'Meeting Notes' folder and list all action items."

> "Using the 'See Also' connections, find surprising links between my history notes and my economics notes."

## Troubleshooting

### "Server connection failed"
- Ensure `dt` is accessible in your path. The absolute path provided by `dt mcp config` is the safest bet.
- Ensure DEVONthink 4 is running. The server communicates with it via AppleScript.

### Permissions
- macOS may ask for permission for `Terminal`, `Node`, or `Claude` to control `DEVONthink`. Click "OK".

### Debugging
You can test the server manually in your terminal (it speaks JSON-RPC over stdin):
```bash
dt mcp run
```
(It will wait for input. This confirms it starts correctly.)

## Tools Reference

The server exposes the following tools to the AI:

| Tool Name | Description |
|-----------|-------------|
| `search_records` | Search for records using a query string. |
| `get_record_content` | Read the text content of a specific UUID. |
| `get_related_records` | Get backlinks, outgoing links, and AI similarities. |
| `list_group_contents` | List records within a specific group UUID. |
