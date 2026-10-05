# Jednoriadková inštalácia pre Windows (PowerShell): stiahne aplikáciu z GitHubu, rozbalí a spustí START.bat
$ErrorActionPreference = 'Stop'
$dest = "$env:USERPROFILE\SXWorkforce"
Write-Host "Stahujem aplikaciu do $dest ..."
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Invoke-WebRequest -Uri "https://github.com/Lubo585/Lubo585/archive/refs/heads/claude/determined-mccarthy-7jfplr.zip" -OutFile "$dest\app.zip"
Expand-Archive -Path "$dest\app.zip" -DestinationPath "$dest\tmp" -Force
$src = Get-ChildItem "$dest\tmp" | Select-Object -First 1
Copy-Item "$($src.FullName)\*" $dest -Recurse -Force
Remove-Item "$dest\tmp", "$dest\app.zip" -Recurse -Force
Write-Host "Hotovo. Spustam START.bat ..."
Set-Location $dest
cmd /c START.bat
