# Instalador customizado do ESMP

Gerar (no Windows): `npm run dist:all` na pasta principal.
1. `npm run dist` gera `dist/ESMP-Launcher-Setup-x.y.z.exe` (esse continua indo pro GitHub Release: é ele que faz o auto-update).
2. `npm run dist:installer` embute esse arquivo e gera `installer/dist/Instalar-ESMP.exe` (esse é o que você entrega pros jogadores).

Testar a interface sem gerar o .exe: `cd installer && npm install && npm start` (precisa ter rodado o passo 1 e `node prepare.js`).
