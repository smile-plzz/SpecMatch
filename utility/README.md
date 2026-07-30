# SpecMatch Hardware Scan Utility (Windows)

Collects gaming-relevant hardware info via built-in CIM/WMI — no runtime install
required. Writes `report.json` next to itself and prints a summary. **Never
uploads anything automatically** — review the JSON, then upload it yourself on
the SpecMatch website.

## What it collects

CPU model/cores/threads, GPU model/VRAM, RAM size, primary drive type (SSD/HDD)
and free space, OS name/version/architecture, display resolution/refresh rate,
DirectX version.

## What it does NOT collect

Computer name, username, disk serial numbers, MAC/IP address, or any other
personally-identifying data.

## Run it

```powershell
powershell -ExecutionPolicy Bypass -File collect-specs.ps1
```

Or download `collect-specs.exe` from the GitHub Releases page (built via
`build-exe.ps1` + [ps2exe](https://github.com/MScholtes/PS2EXE)) and double-click
it. Verify the SHA256 checksum listed in the release notes before running an exe
downloaded from the internet.

## Building the exe

```powershell
powershell -ExecutionPolicy Bypass -File build-exe.ps1
```

Requires the `ps2exe` PowerShell module (auto-installed on first run).
