@echo off
REM Detiene KeFounder!: el servidor (puerto 3000) y el frontend en vivo de Vite (puerto 5173).
powershell -NoProfile -Command "$n = 0; foreach ($port in 3000, 5173) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; $n++ } }; if ($n) { Write-Host 'KeFounder! detenido.' } else { Write-Host 'KeFounder! no estaba corriendo.' }"
pause
