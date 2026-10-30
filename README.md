# SMP Launcher

    npm install
    npm start

## O que o launcher tem
- **Jogar**: status do servidor em tempo real (online/jogadores/ping, clique pra copiar o IP), versão do pack, barra de progresso.
- **Pack**: lista de mods com tamanho e se estão instalados, busca, e "Verificar e reparar arquivos".
- **Console**: log do Minecraft em tempo real (copiar/limpar). Ótimo pra achar crash.
- **Ajustes**: RAM, tela cheia/resolução, caminho do Java, argumentos da JVM, minimizar ao jogar, abrir pasta do jogo.
- Se a API estiver fora do ar, joga com o último pack baixado.
- Confere se o Java instalado serve pra versão do Minecraft antes de abrir.

## Configurar
- `src/config.js`: nome, URL da API, IP do servidor, versão.
- `package.json`: troque SEU_USUARIO pelo seu usuário do GitHub (campos "author" e "publish").
- Fundo: coloque sua imagem em `renderer/bg.jpg` e troque `bg.svg` por `bg.jpg` no `style.css`.

## Publicar uma atualização do launcher
1. Aumente "version" no package.json (ex.: 0.1.1)
2. git commit -am "v0.1.1"
3. git tag v0.1.1 && git push && git push --tags
O GitHub Action compila e cria a Release. Os launchers instalados se atualizam sozinhos.
(O auto-update só funciona no app instalado, não no `npm start`.)
