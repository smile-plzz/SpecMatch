<#
SpecMatch hardware scan utility (Windows).

Collects ONLY gaming-relevant hardware facts via built-in CIM/WMI — no third
party runtime required. Explicitly does NOT collect: computer name, username,
disk serial numbers, MAC/IP addresses, or any other personally-identifying
data. Writes report.json next to the script/exe and prints a human-readable
summary. Never uploads anything itself — upload is a separate, explicit step
on the website so the user can review the exact JSON first.

Usage:
  powershell -ExecutionPolicy Bypass -File collect-specs.ps1
  (or run the compiled collect-specs.exe directly)
#>

$ErrorActionPreference = 'SilentlyContinue'

function Get-DirectXVersion {
    $tmp = Join-Path $env:TEMP "specmatch-dxdiag.txt"
    Start-Process -FilePath "dxdiag.exe" -ArgumentList "/t `"$tmp`"" -Wait -WindowStyle Hidden
    if (Test-Path $tmp) {
        $line = Select-String -Path $tmp -Pattern "DirectX Version:" | Select-Object -First 1
        Remove-Item $tmp -ErrorAction SilentlyContinue
        if ($line) { return ($line.Line -replace ".*DirectX Version:\s*", "").Trim() }
    }
    return $null
}

function Get-PrimaryDiskType {
    try {
        $physicalDisk = Get-CimInstance -Namespace root\Microsoft\Windows\Storage -ClassName MSFT_PhysicalDisk | Select-Object -First 1
        if ($physicalDisk) {
            switch ($physicalDisk.MediaType) {
                3 { return "HDD" }
                4 { return "SSD" }
                5 { return "SCM" }
                default { return "Unknown" }
            }
        }
    } catch {}
    return $null
}

$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
$os = Get-CimInstance Win32_OperatingSystem
$mem = Get-CimInstance Win32_PhysicalMemory
$sysDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"

$ramBytes = ($mem | Measure-Object -Property Capacity -Sum).Sum
$ramGB = if ($ramBytes) { [math]::Round($ramBytes / 1GB, 1) } else { $null }

$vramGB = if ($gpu.AdapterRAM -and $gpu.AdapterRAM -gt 0) {
    [math]::Round($gpu.AdapterRAM / 1GB, 2)
} else { $null } # AdapterRAM is a 32-bit field and often wrong/absent on modern GPUs — null is honest

$report = [ordered]@{
    source      = "utility"
    collectedAt = (Get-Date).ToUniversalTime().ToString("o")
    os          = [ordered]@{
        name    = $os.Caption
        version = $os.Version
        arch    = $os.OSArchitecture
    }
    cpu         = [ordered]@{
        model   = $cpu.Name.Trim()
        cores   = $cpu.NumberOfCores
        threads = $cpu.NumberOfLogicalProcessors
    }
    gpu         = [ordered]@{
        model  = $gpu.Name
        vramGB = $vramGB
    }
    ramGB       = $ramGB
    storage     = [ordered]@{
        type    = Get-PrimaryDiskType
        freeGB  = if ($sysDrive) { [math]::Round($sysDrive.FreeSpace / 1GB, 1) } else { $null }
    }
    display     = [ordered]@{
        width     = $gpu.CurrentHorizontalResolution
        height    = $gpu.CurrentVerticalResolution
        refreshHz = $gpu.CurrentRefreshRate
    }
    directx     = Get-DirectXVersion
}

$json = $report | ConvertTo-Json -Depth 5
$outPath = Join-Path $PSScriptRoot "report.json"
$json | Out-File -FilePath $outPath -Encoding utf8

Write-Host ""
Write-Host "SpecMatch hardware scan complete." -ForegroundColor Cyan
Write-Host "No computer name, username, or serial numbers were collected." -ForegroundColor DarkGray
Write-Host ""
Write-Host $json
Write-Host ""
Write-Host "Report written to: $outPath"
Write-Host "Review this file, then upload it at the SpecMatch website. Nothing is sent automatically."
