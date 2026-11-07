@echo off
rem Server manager for Windows (docs/hosting.md, "Managing the server").
rem Double-click to update and start: stop, pull, install, build, start.
rem From a terminal: server stop, server start, server restart, server status.
cd /d "%~dp0"
node scripts\server.mjs %*
if errorlevel 1 pause
