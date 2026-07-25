# Observatório EUA–Irã — versão para Codex no PC

Este pacote contém o código-fonte da plataforma, sem `node_modules`, arquivos de compilação ou histórico interno.

## 1. Preparar o computador

Instale:

- Node.js 22 ou mais recente;
- Git;
- Codex para Windows, Codex CLI ou a extensão Codex para VS Code.

## 2. Abrir no Codex

1. Extraia o ZIP para uma pasta, por exemplo `Documentos/observatorio-eua-ira`.
2. Abra o Codex no computador.
3. Use **Abrir pasta** e selecione `observatorio-eua-ira-codex`.
4. Diga ao Codex: `Analise este projeto, instale as dependências e execute-o localmente.`

## 3. Executar manualmente

Abra o terminal dentro da pasta e rode:

```powershell
npm install
npm run dev
```

O terminal mostrará o endereço local da plataforma. Normalmente será `http://localhost:3000` ou outro endereço informado pelo Vite.

## Comandos úteis

```powershell
npm run dev
npm run build
npm run start
```

## Atualizações de notícias

A rota `app/api/news/route.ts` consulta o GDELT. Para receber notícias, o computador ou o ambiente de hospedagem precisa ter acesso à internet.

## Observação

O site publicado continua disponível separadamente. Alterações feitas nesta cópia local não atualizam automaticamente a versão publicada.
