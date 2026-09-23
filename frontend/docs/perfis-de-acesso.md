# Integração de perfis, login e PostgreSQL

Veja também o [registro da primeira entrega](./primeira-entrega.md) e o [roteiro de testes da equipe](./testes-primeira-entrega.md).

## Executar localmente

O frontend usa a API real. Cadastros ficam no PostgreSQL e permanecem após
recarregar. A sessão fica em memória: recarregar exige novo login.

1. Inicie o PostgreSQL do projeto (porta 5432) e mantenha as credenciais em
   `backend/.env`.
2. Na pasta `backend`, execute `npm ci`, `npm run build` e, no PowerShell:

   ```powershell
   $env:DATABASE_HOST='127.0.0.1'
   $env:PORT='3001'
   node dist/main.js
   ```

3. Configure `frontend/.env.local`:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://localhost:3001
   ```

4. Na pasta `frontend`, execute `npm ci` e `npx expo start --web --port 8081`.
   Abra http://localhost:8081. Documentação da API: http://localhost:3001/docs.

A porta 3001 permite testar sem encerrar a API existente na porta 3000.
Para Expo Go em aparelho físico, use o IP de rede do computador na URL da API.
O aparelho e o computador devem conseguir se comunicar na mesma rede.

O esquema usa a configuração de desenvolvimento já existente do TypeORM
(`synchronize`). Em produção ela permanece desativada; a implantação requer
migrações revisadas. Não use a configuração de desenvolvimento em produção.

## Superadmin

`users.isSuperAdmin` é uma flag no banco, com padrão `false`. Não existe opção
no formulário nem campo gravável na API para concedê-la. O backend verifica a
conta ativa, o perfil e a flag em cada acesso protegido.

Para provisionar a conta inicial, configure `SUPERADMIN_EMAIL` no
`backend/.env`. Se o e-mail já pertence a um administrador ativo, o seed marca
a flag sem alterar a senha. Para criar uma conta inexistente, configure também
`SUPERADMIN_PASSWORD` (mínimo de oito caracteres) e, opcionalmente,
`SUPERADMIN_NAME`. Esses valores são configuração do servidor e não devem
ser enviados ao frontend nem versionados.

## Regras preservadas

| Perfil | Cadastro e acesso |
| --- | --- |
| Administrador | Conta comum; acesso a turmas, alunos e frequência. Sem gestão de contas, financeiro ou cadastro de eventos. |
| Responsável | Conta própria; consulta somente os alunos vinculados. Não exige dependente para criar a conta. |
| Atleta com 18 anos ou mais | Conta e aluno criados juntos, com senha inicial. |
| Atleta menor de 18 anos | Apenas aluno, vinculado a responsável ativo já cadastrado; não recebe conta ou senha. |
| Superadmin | Administrador com flag provisionada no banco; gerencia os perfis. |

Todo cadastro começa em **Gerenciamento de Contas → Novo perfil**.
Conta e aluno são gravados em uma transação. Falha de validação não deixa
cadastro parcial. A API limita os dados retornados ao vínculo de cada usuário.
Inativação e mudança de senha invalidam os tokens anteriores.

## Senha inicial

Mantida exatamente a função que veio do backend:

```ts
name.trim().slice(0, 3).toLowerCase() + DDMMAAAA
```

Usa nome e nascimento do titular, converte o prefixo para minúsculas e mantém
acentos. Exemplos: Rodrigo → `rod15052002`; Álvaro → `álv05091980`.
O frontend apenas apresenta a prévia; a geração definitiva ocorre no servidor,
que armazena o hash bcrypt. A alteração após o primeiro acesso é opcional.
Editar os dados pessoais não regenera a senha.

## Escopo entregue

Login, sessão, cadastro/edição unificados, ativação/inativação, vínculo de menores,
redefinição administrativa e alteração da própria senha usam a API e o banco.
As telas de turmas, alunos e frequência consultam os dados persistidos.

Financeiro continua provisório. Cadastro de eventos e lançamento de frequência
não fazem parte desta integração. Nenhum evento ou presença fictícia é mostrado.
O catálogo inicial de três turmas é inserido somente quando o banco não tem turmas.

## Verificação

- Frontend: `npm run typecheck` e `npm test`.
- Backend: `npm run build` e `npm test`.
- Integração real: com a API e o banco locais ligados, configure
  `INTEGRATION_ADMIN_EMAIL`, `INTEGRATION_ADMIN_PASSWORD` e, opcionalmente,
  `INTEGRATION_API_URL`; execute `node test/access.integration.mjs` em backend.

O teste de integração cria dados identificados por execução e remove apenas
esses registros ao terminar. Verifica permissões, limite de 18 anos, vínculo de
menor, edição, inativação, senhas e persistência diretamente no PostgreSQL.
