# LSMP Launcher

    npm install
    npm start

## Telas
- **Início**: jogadores online, ping, tempo de jogo, últimas novidades, RAM rápida, Jogar / Fechar jogo / Reparar.
- **Novidades**: notas das Releases do GitHub.
- **Servidor**: status, MOTD, versão, jogadores, histórico de ping, copiar IP.
- **Mods**: busca, filtro, ordenação, verificar e reparar.
- **Capturas**: galeria das screenshots do jogo.
- **Console**: log do Minecraft em tempo real.
- **Ajustes**: RAM, tela, Java (detectar/procurar), otimização da JVM, cor de destaque, imagem de fundo, iniciar com o Windows, restaurar padrões.

## Configurar
- `src/config.js`: nome, API, IP do servidor, versão e `GITHUB_REPO`.
- Imagens (opcional): `renderer/bg.jpg` (fundo padrão) e `renderer/logo.png` (logo). O jogador também pode escolher o fundo em Ajustes > Aparência.

## Publicar uma atualização do launcher
1. `git commit -am "mudanças"`
2. `git tag v0.4.1 && git push && git push --tags`

O GitHub Action ajusta a versão do app pela tag, compila e cria a Release. Os launchers instalados se atualizam sozinhos.

### Se o auto-update não funcionar
- O repositório precisa ser **público** (ou o updater não consegue ler a Release).
- A Release precisa estar **publicada** (não rascunho) e conter `latest.yml` + o `.exe`.
- A tag precisa ser maior que a versão instalada.
- No app: Ajustes > Launcher > "Verificar atualizações" mostra o motivo; "Ver log do launcher" tem os detalhes.
- Só funciona no app instalado, não no `npm start`.
