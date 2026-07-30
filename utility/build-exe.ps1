<#
Compiles collect-specs.ps1 into a standalone collect-specs.exe via ps2exe, so
users can double-click instead of running PowerShell manually.

Run once per release:
  powershell -ExecutionPolicy Bypass -File build-exe.ps1
#>

if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Install-Module -Name ps2exe -Scope CurrentUser -Force
}

Import-Module ps2exe

Invoke-ps2exe `
    -inputFile "$PSScriptRoot\collect-specs.ps1" `
    -outputFile "$PSScriptRoot\collect-specs.exe" `
    -title "SpecMatch Hardware Scan" `
    -product "SpecMatch" `
    -noConsole:$false `
    -requireAdmin:$false

Write-Host "Built: $PSScriptRoot\collect-specs.exe"
Write-Host "Publish via GitHub Releases with a SHA256 checksum (Get-FileHash) in the release notes."
