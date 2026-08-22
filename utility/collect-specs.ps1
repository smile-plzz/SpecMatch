<#
SpecMatch hardware scan utility (Windows). Report format v3.

Collects ONLY gaming-relevant hardware facts via built-in CIM/WMI — no third
party runtime required. Explicitly does NOT collect: computer name, username,
disk serial numbers, MAC/IP addresses, or any other personally-identifying
data. Writes report.json next to the script/exe and prints a human-readable
summary. Never uploads anything itself — upload is a separate, explicit step
on the website so the user can review the exact JSON first.

v3 replaces v2's "first GPU WMI returns" approach: it enumerates every video
controller, classifies each integrated/discrete, and picks whichever one is
actually driving a display — a laptop with an Intel iGPU + NVIDIA dGPU no
longer silently reports the iGPU as "the" GPU. Every section also carries a
`confidence` flag so a field that couldn't be determined reads as "unknown"
downstream, never as a false zero/default.

Usage:
  powershell -ExecutionPolicy Bypass -File collect-specs.ps1
  (or run the compiled collect-specs.exe directly)
#>

$ErrorActionPreference = 'SilentlyContinue'

function Get-DirectXInfo {
    # Two things broke this in earlier versions, both confirmed against a
    # real machine during implementation:
    # (1) dxdiag.exe re-launches itself and its ORIGINAL process handle exits
    #     almost immediately — the /t file-dump work continues in a separate,
    #     detached process — so Start-Process -Wait / -PassThru+HasExited
    #     returns long before the file exists. Fix: poll for the OUTPUT FILE,
    #     not the launched process.
    # (2) the `/whql:off` flag silently prevents dxdiag from ever writing the
    #     file at all (reproduced directly — identical invocation with vs.
    #     without that flag was the only difference between "never writes"
    #     and "writes reliably in ~15-20s"). Dropped entirely rather than
    #     guessed-around.
    $tmp = Join-Path $env:TEMP "specmatch-dxdiag.txt"
    Remove-Item $tmp -ErrorAction SilentlyContinue
    $result = [ordered]@{ version = $null; wddmVersion = $null; confidence = 'unknown' }
    try {
        dxdiag.exe /t $tmp
        $waited = 0
        while (-not (Test-Path $tmp) -and $waited -lt 30) {
            Start-Sleep -Seconds 1
            $waited++
        }
        if (Test-Path $tmp) {
            # File appears before dxdiag finishes writing it — give it a beat
            # to flush fully rather than reading a half-written file.
            Start-Sleep -Seconds 1
        }
    } catch {}

    if (Test-Path $tmp) {
        $dxLine = Select-String -Path $tmp -Pattern "DirectX Version:" | Select-Object -First 1
        $wddmLine = Select-String -Path $tmp -Pattern "Driver Model:" | Select-Object -First 1
        if ($dxLine) {
            $result.version = ($dxLine.Line -replace ".*DirectX Version:\s*", "").Trim()
            $result.confidence = 'high'
        }
        if ($wddmLine) {
            $result.wddmVersion = ($wddmLine.Line -replace ".*Driver Model:\s*", "").Trim()
        }
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
    return $result
}

function Get-MemoryType {
    param($smBiosType, $typeDetail)
    # SMBIOSMemoryType (Win32_PhysicalMemory) — 26=DDR4, 34=DDR5, 24=DDR3, 21=DDR2, 20=DDR
    switch ($smBiosType) {
        34 { return "DDR5" }
        26 { return "DDR4" }
        24 { return "DDR3" }
        21 { return "DDR2" }
        20 { return "DDR" }
        default { return $null }
    }
}

function Get-DiskType {
    param($mediaType)
    switch ($mediaType) {
        3 { return "HDD" }
        4 { return "SSD" }
        5 { return "SCM" }
        default { return "Unknown" }
    }
}

# ---- CPU -------------------------------------------------------------------
$cpuRaw = Get-CimInstance Win32_Processor | Select-Object -First 1
$cpu = [ordered]@{
    model         = if ($cpuRaw) { $cpuRaw.Name.Trim() } else { $null }
    manufacturer  = if ($cpuRaw) { $cpuRaw.Manufacturer } else { $null }
    cores         = if ($cpuRaw) { $cpuRaw.NumberOfCores } else { $null }
    threads       = if ($cpuRaw) { $cpuRaw.NumberOfLogicalProcessors } else { $null }
    baseClockMHz  = if ($cpuRaw) { $cpuRaw.MaxClockSpeed } else { $null } # WMI exposes rated/max clock only; live current clock isn't reliably available without a perf counter session
    architecture  = if ($cpuRaw) {
        switch ($cpuRaw.AddressWidth) { 64 { "x64" } 32 { "x86" } default { $null } }
    } else { $null }
    confidence    = if ($cpuRaw -and $cpuRaw.Name) { 'high' } else { 'unknown' }
}

# ---- GPU (all adapters, classified, active one chosen) ---------------------
$gpusRaw = Get-CimInstance Win32_VideoController
$gpuList = @()
foreach ($g in $gpusRaw) {
    $vendorId = $null
    if ($g.PNPDeviceID -match 'VEN_10DE') { $vendorId = 'NVIDIA' }
    elseif ($g.PNPDeviceID -match 'VEN_1002') { $vendorId = 'AMD' }
    elseif ($g.PNPDeviceID -match 'VEN_8086') { $vendorId = 'Intel' }

    # Name-pattern fallback classification — PNPDeviceID vendor alone doesn't
    # tell you integrated vs discrete (Intel/AMD both ship both kinds).
    $isIntegrated = $g.Name -match '(Intel\(R\)? (UHD|HD|Iris)|Radeon\(TM\)? Graphics$|Vega \d+ Graphics|AMD Radeon\(TM\)? Graphics)'
    $vramBytes = $g.AdapterRAM
    $vramGB = if ($vramBytes -and $vramBytes -gt 0) { [math]::Round($vramBytes / 1GB, 2) } else { $null }
    $isActive = ($g.CurrentHorizontalResolution -gt 0)

    $gpuList += [ordered]@{
        model         = $g.Name
        vendor        = $vendorId
        integrated    = [bool]$isIntegrated
        vramGB        = $vramGB # AdapterRAM is a legacy 32-bit WMI field — often wrong/capped/absent on modern discrete GPUs; null is honest, never guessed
        driverVersion = $g.DriverVersion
        driverDate    = if ($g.DriverDate) { $g.DriverDate } else { $null }
        active        = $isActive
    }
}

# Prefer any discrete GPU over integrated, regardless of which one is
# "active" (driving a display) — on hybrid/Optimus laptops the discrete GPU
# renders games via GPU offload but never shows as the display-driving
# adapter in WMI, so gating on `active` would silently prefer the iGPU on
# exactly the laptops where this distinction matters most (verified against
# a real Optimus laptop during implementation: iGPU was "active", the GTX
# 1050 dGPU was not, yet the dGPU is what games actually use here).
$primaryGpu = ($gpuList | Where-Object { -not $_.integrated } | Select-Object -First 1)
if (-not $primaryGpu) { $primaryGpu = $gpuList | Where-Object { $_.active } | Select-Object -First 1 }
if (-not $primaryGpu) { $primaryGpu = $gpuList | Select-Object -First 1 }

$integratedGpu = ($gpuList | Where-Object { $_.integrated } | Select-Object -First 1)

$gpu = [ordered]@{
    model         = if ($primaryGpu) { $primaryGpu.model } else { $null }
    vendor        = if ($primaryGpu) { $primaryGpu.vendor } else { $null }
    integrated    = if ($primaryGpu) { $primaryGpu.integrated } else { $null }
    vramGB        = if ($primaryGpu) { $primaryGpu.vramGB } else { $null }
    driverVersion = if ($primaryGpu) { $primaryGpu.driverVersion } else { $null }
    driverDate    = if ($primaryGpu) { $primaryGpu.driverDate } else { $null }
    confidence    = if ($primaryGpu -and $primaryGpu.model) { 'high' } else { 'unknown' }
}
$integratedGpuInfo = if ($integratedGpu -and $integratedGpu.model -ne $gpu.model) {
    [ordered]@{ model = $integratedGpu.model; vramGB = $integratedGpu.vramGB }
} else { $null }

# ---- RAM (total + per-module) ----------------------------------------------
$memModulesRaw = Get-CimInstance Win32_PhysicalMemory
$memModules = @()
foreach ($m in $memModulesRaw) {
    $memModules += [ordered]@{
        capacityGB = [math]::Round($m.Capacity / 1GB, 2)
        speedMHz   = $m.Speed
        type       = Get-MemoryType -smBiosType $m.SMBIOSMemoryType
    }
}
$ramBytes = ($memModulesRaw | Measure-Object -Property Capacity -Sum).Sum
$ramGB = if ($ramBytes) { [math]::Round($ramBytes / 1GB, 1) } else { $null }
$osForMem = Get-CimInstance Win32_OperatingSystem
$ramAvailableGB = if ($osForMem.FreePhysicalMemory) { [math]::Round($osForMem.FreePhysicalMemory / 1MB, 1) } else { $null } # FreePhysicalMemory is reported in KB

$ram = [ordered]@{
    totalGB     = $ramGB
    availableGB = $ramAvailableGB
    modules     = $memModules.Count
    speedMHz    = if ($memModules.Count -gt 0) { $memModules[0].speedMHz } else { $null }
    type        = if ($memModules.Count -gt 0) { $memModules[0].type } else { $null }
    confidence  = if ($ramGB) { 'high' } else { 'unknown' }
}

# ---- OS ---------------------------------------------------------------------
$os = [ordered]@{
    name       = $osForMem.Caption
    version    = $osForMem.Version
    build      = $osForMem.BuildNumber
    arch       = $osForMem.OSArchitecture
    confidence = if ($osForMem.Caption) { 'high' } else { 'unknown' }
}

# ---- Display ------------------------------------------------------------
# Resolution comes from whichever adapter is actually driving the display —
# on a hybrid/Optimus laptop that's usually the iGPU, which is NOT the same
# adapter chosen as `$primaryGpu` above (the gaming-relevant discrete one).
$activeAdapterRaw = $gpusRaw | Where-Object { $_.CurrentHorizontalResolution -gt 0 } | Select-Object -First 1
$displayWidth = if ($activeAdapterRaw) { $activeAdapterRaw.CurrentHorizontalResolution } else { $null }
$displayHeight = if ($activeAdapterRaw) { $activeAdapterRaw.CurrentVerticalResolution } else { $null }
$displayRefresh = if ($activeAdapterRaw) { $activeAdapterRaw.CurrentRefreshRate } else { $null }

$display = [ordered]@{
    width      = $displayWidth
    height     = $displayHeight
    refreshHz  = $displayRefresh
    hdr        = $null # not reliably queryable via built-in CIM/WMI without vendor-specific APIs — left null rather than guessed
    confidence = if ($displayWidth) { 'high' } else { 'unknown' }
}

# ---- Storage ------------------------------------------------------------
$sysDrive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
$physicalDisks = Get-CimInstance -Namespace root\Microsoft\Windows\Storage -ClassName MSFT_PhysicalDisk
$primaryDisk = $physicalDisks | Select-Object -First 1
$diskType = if ($primaryDisk) {
    if ($primaryDisk.BusType -eq 17) { "NVMe" } else { Get-DiskType -mediaType $primaryDisk.MediaType }
} else { $null }

$storage = [ordered]@{
    type        = $diskType
    totalGB     = if ($sysDrive) { [math]::Round($sysDrive.Size / 1GB, 1) } else { $null }
    freeGB      = if ($sysDrive) { [math]::Round($sysDrive.FreeSpace / 1GB, 1) } else { $null }
    driveCount  = ($physicalDisks | Measure-Object).Count
    confidence  = if ($sysDrive) { 'high' } else { 'unknown' }
}

# ---- Form factor / laptop detection ----------------------------------------
# Chassis type codes per Win32_SystemEnclosure.ChassisTypes: 8/9/10/11/12/14/18/21 are laptop/portable variants.
$enclosure = Get-CimInstance Win32_SystemEnclosure | Select-Object -First 1
$laptopChassisCodes = @(8, 9, 10, 11, 12, 14, 18, 21)
$isLaptop = $false
if ($enclosure -and $enclosure.ChassisTypes) {
    foreach ($code in $enclosure.ChassisTypes) {
        if ($laptopChassisCodes -contains $code) { $isLaptop = $true }
    }
}
$battery = Get-CimInstance Win32_Battery | Select-Object -First 1
$formFactor = [ordered]@{
    isLaptop        = $isLaptop
    hasBattery      = [bool]$battery
    batteryPercent  = if ($battery) { $battery.EstimatedChargeRemaining } else { $null }
    confidence      = if ($enclosure) { 'partial' } else { 'unknown' } # chassis-type heuristic, not a guarantee
}

$dxInfo = Get-DirectXInfo

$report = [ordered]@{
    reportVersion  = "3.0"
    source         = "utility"
    collectedAt    = (Get-Date).ToUniversalTime().ToString("o")
    os             = $os
    cpu            = $cpu
    gpu            = $gpu
    integratedGpu  = $integratedGpuInfo
    gpus           = $gpuList
    ram            = $ram
    ramGB          = $ram.totalGB # kept for backward compat with v1/v2 report consumers
    storage        = $storage
    display        = $display
    directx        = $dxInfo.version # kept for backward compat
    directxInfo    = $dxInfo
    formFactor     = $formFactor
}

$json = $report | ConvertTo-Json -Depth 6
$outPath = Join-Path $PSScriptRoot "report.json"
$json | Out-File -FilePath $outPath -Encoding utf8

Write-Host ""
Write-Host "SpecMatch hardware scan complete (report v3)." -ForegroundColor Cyan
Write-Host "No computer name, username, or serial numbers were collected." -ForegroundColor DarkGray
Write-Host ""
Write-Host ("Primary GPU: {0} ({1}, {2})" -f $gpu.model, $(if($gpu.integrated){"integrated"}else{"discrete"}), $(if($gpu.vramGB){"$($gpu.vramGB) GB VRAM"}else{"VRAM unknown"}))
if ($integratedGpuInfo) { Write-Host ("Also detected: {0} (integrated)" -f $integratedGpuInfo.model) }
Write-Host ("CPU: {0} ({1}c/{2}t)" -f $cpu.model, $cpu.cores, $cpu.threads)
Write-Host ("RAM: {0} GB ({1} modules, {2})" -f $ram.totalGB, $ram.modules, $(if($ram.type){$ram.type}else{"type unknown"}))
Write-Host ("Form factor: {0}" -f $(if($formFactor.isLaptop){"Laptop"}else{"Desktop (or undetected)"}))
Write-Host ""
Write-Host $json
Write-Host ""
Write-Host "Report written to: $outPath"
Write-Host "Review this file, then upload it at the SpecMatch website. Nothing is sent automatically."
