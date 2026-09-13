# Arte Suave Gestão — Frontend

Aplicativo mobile do projeto Arte Suave Gestão, desenvolvido com React Native (Expo) e TypeScript.

## Stack

- **Expo** — framework/CLI para desenvolvimento React Native
- **React Native** — renderização de componentes nativos (Android/iOS)
- **TypeScript** — tipagem estática em todo o projeto
- **React Navigation** (native-stack) — navegação entre telas

## Pré-requisitos

- [Node.js](https://nodejs.org/) (LTS)
- Aplicativo **Expo Go** instalado no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) — para testar sem emulador

## Como rodar

```bash
npm install
npx expo start
```

Escaneie o QR code exibido no terminal com o app **Expo Go** (Android) ou a câmera do iPhone (iOS).

## Estrutura de pastas

frontend/
├── App.tsx # ponto de montagem do app (renderiza as rotas)
├── index.ts # entry point registrado no Metro/Expo
├── app.json # configuração do Expo (nome, ícone, splash...)
├── src/
│ ├── screens/ # telas do app (uma por arquivo)
│ ├── components/ # componentes reutilizáveis entre telas
│ ├── routes/ # configuração de navegação (Stack Navigator)
│ ├── services/ # integração com a API (chamadas HTTP)
│ └── assets/ # imagens, fontes e ícones usados nas telas