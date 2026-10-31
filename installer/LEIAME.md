# Instalador customizado do ESMP

Gerar: `cd installer && npm install && npm run dist` (ou deixe o GitHub Actions fazer na release).
Ele é leve: NÃO embute o launcher. Na hora de instalar, baixa o `ESMP-Launcher-Setup-*.exe` da última release do GitHub.
Por isso a release precisa ter esse arquivo anexado (o electron-builder já faz isso).
