@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Pasang Node.js 24 dahulu, lalu jalankan file ini lagi.
  echo Situs resmi: https://nodejs.org/
  pause
  exit /b 1
)
node -e "if(process.versions.node.split('.')[0]!=='24'){console.error('Proyek ini diuji pada Node.js 24. Gunakan Node.js versi 24.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
echo Buka http://localhost:3000 setelah pesan server siap muncul.
echo Biarkan jendela ini tetap terbuka selama website dipakai.
node --env-file-if-exists=.env server/index.mjs
pause
