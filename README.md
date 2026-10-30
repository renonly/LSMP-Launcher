# SMP Launcher

    npm install
    npm start

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
