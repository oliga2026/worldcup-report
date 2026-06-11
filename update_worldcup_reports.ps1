param(
    [string]$Message = ("Update World Cup reports " + (Get-Date -Format "yyyy-MM-dd"))
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

node .\generate_reports.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Error "generate_reports.mjs failed."
    exit 1
}

@'
const fs = require("fs");
const text = fs.readFileSync("data/reports.json", "utf8");
JSON.parse(text);
console.log("REPORTS_JSON_OK");
'@ | node -
if ($LASTEXITCODE -ne 0) {
    Write-Error "data/reports.json JSON validation failed."
    exit 1
}

$insideRepo = (git rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -eq 0 -and $insideRepo -eq "true") {
    $origin = git remote get-url origin 2>$null
    if ($LASTEXITCODE -eq 0 -and $origin) {
        powershell -NoProfile -ExecutionPolicy Bypass -File .\publish_report.ps1 -Message $Message
        exit $LASTEXITCODE
    }
}

Write-Host "data/reports.json updated locally, but no usable origin remote was found."
