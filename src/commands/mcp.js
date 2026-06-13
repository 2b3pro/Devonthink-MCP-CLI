/**
 * MCP Command
 * Management of the Model Context Protocol server
 * @version 2.0.0
 */

import { runMcpServer, runMcpHttpServer } from '../mcp-server.js';
import { requireDevonthink } from '../jxa-runner.js';

export function registerMcpCommand(program) {
  const mcp = program
    .command('mcp')
    .description('Model Context Protocol (MCP) server for DEVONthink');

  mcp
    .command('run')
    .description('Run the MCP server on stdio')
    .addHelpText('after', `
Examples:
  dt mcp run
`)
    .action(async () => {
      try {
        await requireDevonthink();
        await runMcpServer();
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });
    
  mcp
    .command('serve')
    .description('Run the MCP server over HTTP Streamable transport (shared, multi-client)')
    .option('-p, --port <port>', 'Port to bind (env: DT_MCP_PORT)', process.env.DT_MCP_PORT || '8765')
    .option('-H, --host <host>', 'Host to bind, use 0.0.0.0 to expose on LAN (env: DT_MCP_HOST)', process.env.DT_MCP_HOST || '127.0.0.1')
    .option('-t, --token <token>', 'Require this Bearer token on every request (env: DT_MCP_AUTH_TOKEN)')
    .addHelpText('after', `
A single long-lived HTTP daemon that multiple MCP clients connect to, instead of
each session spawning its own stdio subprocess. Point clients at:
  { "type": "http", "url": "http://127.0.0.1:8765/mcp" }

Examples:
  dt mcp serve                      # foreground on 127.0.0.1:8765
  dt mcp serve -p 9000              # custom port
  dt mcp serve -H 0.0.0.0 -t SECRET # expose on LAN, require a bearer token

Endpoints:  POST/GET/DELETE /mcp   (MCP)   |   GET /health   (liveness)
For an always-on daemon, run this from a launchd/pm2 unit.
`)
    .action(async (options) => {
      try {
        await requireDevonthink();
        await runMcpHttpServer({
          port: options.port,
          host: options.host,
          token: options.token,
        });
        // Keep the process alive; the HTTP server holds the event loop.
      } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  mcp
    .command('config')
    .description('Display the configuration for Claude Desktop')
    .option('--json', 'Output raw JSON')
    .option('--pretty', 'Pretty print JSON output')
    .option('-q, --quiet', 'Minimal output')
    .option('--http', 'Show HTTP Streamable transport config instead of stdio')
    .option('-p, --port <port>', 'Port for --http config', process.env.DT_MCP_PORT || '8765')
    .option('-H, --host <host>', 'Host for --http config', process.env.DT_MCP_HOST || '127.0.0.1')
    .addHelpText('after', `
Examples:
  dt mcp config            # stdio config (default)
  dt mcp config --http     # HTTP Streamable config (run "dt mcp serve" first)
`)
    .action((options) => {
        if (options.http) {
            const config = {
                "mcpServers": {
                    "devonthink-mcp": {
                        "type": "http",
                        "url": `http://${options.host}:${options.port}/mcp`
                    }
                }
            };
            console.log("\nStart the server with:  dt mcp serve");
            console.log("Then add this to your MCP client configuration:\n");
            console.log(JSON.stringify(config, null, 2));
            console.log("\n");
            return;
        }
        const fullPath = process.argv[1];
        const config = {
            "mcpServers": {
                "devonthink-mcp": {
                    "command": process.execPath,
                    "args": [fullPath, "mcp", "run"],
                    "env": {
                        "PATH": process.env.PATH,
                        "DT_ORGANIZE_PROMPT": process.env.DT_ORGANIZE_PROMPT || ""
                    }
                }
            }
        };
        console.log("\nAdd this to your Claude Desktop configuration file:");
        console.log("(Typically ~/Library/Application Support/Claude/claude_desktop_config.json)\n");
        console.log(JSON.stringify(config, null, 2));
        console.log("\n");
    });
}
