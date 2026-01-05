#!/usr/bin/env osascript -l JavaScript
// Check if DEVONthink is running
// Usage: osascript -l JavaScript isRunning.js

const app = Application("System Events");
const processes = app.processes.whose({ name: { _beginsWith: "DEVONthink" } });

const isRunning = processes.length > 0;

JSON.stringify({
  success: true,
  running: isRunning,
  message: isRunning ? "DEVONthink is running" : "DEVONthink is not running"
});
