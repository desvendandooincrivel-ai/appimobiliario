---
description: Workflow para gerar uma nova versão e publicar a atualização no GitHub
---

Este workflow descreve como lançar uma nova versão do **Jobh Imóveis Manager**.
Quando você executar este processo, o aplicativo detectará a atualização e baixará automaticamente para os usuários.

### Pré-requisitos
1. Você deve ter uma conta no GitHub.
2. Você deve ter um **Token de Acesso Pessoal (Classic)** do GitHub configurado no seu sistema ou passado no comando.
   - Para criar: GitHub -> Settings -> Developer Settings -> Personal access tokens -> Tokens (classic) -> Generate new token.
   - Escopos necessários: `repo` (instrução completa de leitura/escrita).

### Passo 1: Atualizar a Versão
Abra o arquivo `package.json` e aumente o número da versão.
Exemplo: Mudar de `"version": "0.1.0"` para `"version": "0.1.1"`.

### Passo 2: Gerar e Publicar
Abra o terminal na pasta do projeto e execute uma dadas opções abaixo.

**Opção A (Se você já configurou a variável de ambiente GH_TOKEN no Windows):**
```bash
npm run electron:build -- --publish always
```

**Opção B (Passando o token diretamente no comando - Recomendado para rapidez):**
Substitua `SEU_TOKEN_AQUI` pelo token que você gerou no GitHub.
*No Windows (PowerShell):*
```powershell
$env:GH_TOKEN="SEU_TOKEN_AQUI"; npm run electron:build -- --publish always
```
*No Windows (CMD):*
```cmd
set GH_TOKEN=SEU_TOKEN_AQUI && npm run electron:build -- --publish always
```

### O que acontece depois?
1. O comando vai gerar o executável (`.exe`).
2. Ele fará o upload desse arquivo para a aba "Releases" do seu repositório `jobh-imoveis-manager`.
3. Os usuários que abrirem o App antigo receberão a atualização silenciosamente.
