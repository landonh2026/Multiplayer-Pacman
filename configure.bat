@REM https:\go.microsoft.com\fwlink\?LinkID=135170
@REM this assumes node is installed and above command is run

powershell -c "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser"
powershell -c "irm bun.sh/install.ps1 | iex"
npm install -g typescript
pause