$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== Starting npm install ==="
Set-Location -Path 'D:\GLXT\GLXT'

# Try using node directly with npm's entry point
$npmCli = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'
$nodeExe = 'C:\Program Files\nodejs\node.exe'

if (Test-Path $npmCli) {
    Write-Host "Found npm-cli.js"
    & $nodeExe $npmCli install --loglevel=verbose 2>&1
} else {
    Write-Host "npm-cli.js not found"
}

Write-Host "=== npm install finished ==="