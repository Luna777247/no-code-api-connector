<#
start-frontend.ps1

PowerShell helper to start the frontend dev server with environment variables loaded from a .env file.

Usage examples:
.
# Start dev on default port (3001) and load .env.local if present
> .\start-frontend.ps1

# Start dev on port 3002 and explicitly load .env.development
> .\start-frontend.ps1 -Port 3002 -EnvFile .env.development

# Run npm install first, then start
> .\start-frontend.ps1 -Install

# Parameters
# -Port    : Port for dev server (default 3001)
# -EnvFile : Path to env file relative to frontendphp (default .env.local)
# -Install : Run `npm install` before starting
#>
param(
    [int]$Port = 3001,
    [string]$EnvFile = '.env.local',
    [switch]$Install
)

Set-StrictMode -Version Latest

function Load-EnvFile($path) {
    if (-not (Test-Path $path)) {
        Write-Verbose "Env file '$path' not found, skipping"
        return
    }

    Write-Host "Loading env vars from: $path"
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        # match KEY=VALUE (allow = in value)
        if ($line -match '^[\s]*([^=\s]+)=(.*)$') {
            $key = $matches[1]
            $val = $matches[2]
            # remove optional surrounding quotes
            if ($val.Length -ge 2 -and ($val.StartsWith('"') -and $val.EndsWith('"') -or ($val.StartsWith("'") -and $val.EndsWith("'")))) {
                $val = $val.Substring(1, $val.Length - 2)
            }
            Write-Host "  Setting: $key"
            $env:$key = $val
        }
    }
}

# Move to frontend folder (script lives in that folder in repo)
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location $scriptDir
Write-Host "Working directory: $(Get-Location)"

# Optionally run npm install
if ($Install) {
    Write-Host "Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Load env file if present
$envPath = Join-Path (Get-Location) $EnvFile
Load-EnvFile $envPath

# Set port
$env:PORT = $Port.ToString()
Write-Host "Starting dev server on port $env:PORT..."

# Run dev server in current console so logs are visible
npm run dev

# End of script
