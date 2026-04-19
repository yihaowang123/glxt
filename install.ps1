#!/usr/bin/env pwsh
$ErrorActionPreference = "Continue"
Write-Host "Starting npm install..."
cd d:\GLXT\GLXT
npm.cmd install 2>&1
Write-Host "npm install completed with exit code: $LASTEXITCODE"
if (Test-Path "node_modules") {
    Write-Host "node_modules exists"
    Get-ChildItem "node_modules" | Select-Object -First 5 Name
} else {
    Write-Host "node_modules does NOT exist"
}