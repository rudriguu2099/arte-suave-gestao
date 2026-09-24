# Como testar a primeira entrega

Este roteiro usa PostgreSQL em Docker e backend/frontend no terminal.
Execute em um banco local de desenvolvimento. Os caminhos começam na raiz do
clone `arte-suave-gestao`, sem depender do nome de usuário do autor.

## 1. Obter a entrega

Receba o link do PR ou o nome da branch e o commit publicados.
Com suas alterações locais preservadas, busque a branch indicada:

```bash
git fetch origin
git switch NOME_DA_BRANCH_PUBLICADA
git pull --ff-only
git rev-parse --short HEAD
```

Substitua `NOME_DA_BRANCH_PUBLICADA` pelo nome informado pela equipe.
Se houver merge em andamento no seu clone, conclua-o com revisão antes de
trocar de branch. Não use comandos de descarte para conseguir seguir o roteiro.

Pré-requisitos: Node.js 24 (versão usada no projeto), npm, Git e Docker
Desktop funcionando. Para celular, Expo Go compatível com o SDK do projeto
e acesso à mesma rede do computador.

## 2. Configurar o backend

Na raiz do repositório, copie o exemplo apenas se ainda não existir um arquivo
local. Git Bash:

```bash
test -f backend/.env || cp backend/.env.example backend/.env
```

PowerShell:

```powershell
if (!(Test-Path backend/.env)) {
  Copy-Item backend/.env.example backend/.env
}
```

Edite `backend/.env` para este roteiro:

```dotenv
NODE_ENV=development
PORT=3001
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=arte_suave_gestao
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_LOCAL
JWT_EXPIRES_IN=1d
SUPERADMIN_EMAIL=gestor.teste@example.com
SUPERADMIN_PASSWORD=SUBSTITUA_POR_UMA_SENHA_LOCAL
SUPERADMIN_NAME=Gestor de Testes
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

Substitua os dois valores de segredo antes de iniciar. A senha do superadmin
precisa ter pelo menos oito caracteres. Cada dev define sua própria senha;
não há uma credencial universal garantida em um banco novo.

Se o e-mail já for de um administrador ativo, o seed concede a flag e
**preserva a senha existente**. Mudar SUPERADMIN_PASSWORD não redefine essa senha.
Se a conta estiver inativa, excluída ou tiver outro perfil, o provisionamento falha
com uma mensagem; use uma conta apropriada.

## 3. Iniciar somente o banco

Na raiz do repositório:

```bash
docker compose --env-file backend/.env up -d db
docker compose --env-file backend/.env ps db
```

Aguarde o serviço ficar saudável. O comando passa explicitamente o arquivo de
configuração para que as credenciais do banco e da API coincidam.
Este roteiro não inicia o serviço backend do Compose: a API será executada
no terminal, na porta 3001.

Se já houver PostgreSQL na porta 5432, use a instância local configurada ou ajuste
a porta de forma consistente. Alterar as variáveis do Compose não troca a senha
de um banco que já existe no volume. Não apague volumes para resolver isso.

## 4. Iniciar a API — terminal 1

Entre na pasta backend a partir da raiz:

```bash
cd backend
npm ci
npm run build
node dist/main.js
```

Esses comandos funcionam em Git Bash e PowerShell, pois PORT e DATABASE_HOST
já foram definidos no arquivo .env. Variáveis exportadas anteriormente no
terminal têm precedência: confira-as se o servidor usar outra porta ou host.

Mantenha o terminal aberto. Confira http://localhost:3001/docs.
Após alterar o código, interrompa com Ctrl+C, compile e inicie novamente.

## 5. Iniciar o frontend — terminal 2

Abra outro terminal na raiz e edite/crie `frontend/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Não use literalmente SEU_IP e não copie um IP de exemplo.
Para testar pelo navegador do computador:

```bash
cd frontend
npm ci
npx expo start --web --port 8081
```

Abra http://localhost:8081. Entre com SUPERADMIN_EMAIL e a senha definida
para o seu banco. Mantenha os dois terminais abertos.

## 6. Testar no celular

1. No Windows, execute `ipconfig` e encontre o IPv4 da conexão ativa que tem
   gateway. Ignore os adaptadores virtuais de WSL, Docker e Hyper-V.
2. Ligue o celular à rede do mesmo roteador. O computador pode estar por cabo.
3. No navegador do celular, abra `http://IP_REAL_DO_COMPUTADOR:3001/docs`.
   Só prossiga quando a API responder.
4. Altere `frontend/.env.local` para
   `EXPO_PUBLIC_API_URL=http://IP_REAL_DO_COMPUTADOR:3001`.
5. Pare o frontend com Ctrl+C e, na pasta frontend, execute:

   ```bash
   npx expo start --lan --clear
   ```

6. Escaneie o QR Code com Expo Go no Android ou pela câmera do iPhone.

No celular, localhost se refere ao próprio aparelho. Se o IP do computador
mudar, atualize o arquivo e reinicie o Expo.
Se o Swagger não abrir, confira a API ligada, o IP, a rede e as regras do
firewall para a porta 3001. Não desative o firewall inteiro.
O túnel do Expo, sozinho, não torna a API local acessível.

## 7. Dados sugeridos para teste manual

Use apenas dados fictícios. Em novas rodadas, troque os e-mails para evitar
duplicidade. Comece criando os responsáveis pelo superadmin.

| Pessoa | Função / nascimento | E-mail | Senha inicial esperada |
| --- | --- | --- | --- |
| Paulo Teste A | Responsável / 12/06/1980 | paulo.a.teste@example.com | pau12061980 |
| Maria Teste B | Responsável / 10/02/1985 | maria.b.teste@example.com | mar10021985 |
| Carlos Instrutor | Administrador / 15/03/1990 | carlos.teste@example.com | car15031990 |
| Álvaro Atleta | Atleta / 05/09/2000 | alvaro.teste@example.com | álv05092000 |
| João Menor | Atleta / nascimento de dez anos atrás | Opcional | Não recebe senha |

Para os atletas, selecione uma turma existente. Para João, selecione Paulo
como responsável. A composição das senhas acima corresponde ao código original:
três caracteres em minúsculas, mantendo acentos, mais DDMMAAAA.

## 8. Checklist de aceite

Registre aprovado/reprovado para cada cenário.

| ID | Procedimento | Resultado esperado |
| --- | --- | --- |
| T01 | Entrar com o superadmin local. | Início com identificação de superadmin e gerenciamento de contas disponível. |
| T02 | Criar Paulo e Maria como responsáveis sem dependentes. | Contas criadas, senha inicial apresentada e login permitido. |
| T03 | Criar Carlos como Administrador e entrar com ele. | Consulta de turmas, alunos e frequência; sem gestão de contas, financeiro ou cadastro de eventos. |
| T04 | Criar Álvaro como atleta adulto, informando turma. | Conta e aluno criados juntos; login com álv05092000 e consulta do próprio vínculo. |
| T05 | Criar atleta que completa exatamente 18 anos hoje. | Conta própria e senha geradas. |
| T06 | Tentar criar atleta que só completa 18 anos amanhã, sem responsável. | Cadastro recusado; exige responsável ativo já cadastrado. |
| T07 | Criar João menor, vinculado a Paulo. | Aluno criado sem conta/senha própria; senha de Paulo permanece igual. |
| T08 | Entrar como Paulo e depois como Maria. | Paulo vê João; Maria não vê João nem o atleta adulto. |
| T09 | Editar João e trocar Paulo por Maria como responsável. | Após atualizar os dados, Paulo perde a visualização e Maria passa a ver João. |
| T10 | Editar nome/contatos de Álvaro e entrar novamente. | Alterações persistem; sem conta/aluno duplicado e sem regenerar a senha. |
| T11 | Tentar repetir um e-mail de conta e informar nascimento inválido. | Erro de validação; nenhum cadastro parcial. |
| T12 | Inativar a conta de Álvaro e tentar entrar. Depois reativá-la. | Login bloqueado enquanto inativa; após reativação exige sessão nova. |
| T13 | Inativar somente João. | Aluno fica inativo; a conta de seu responsável continua ativa. |
| T14 | Como superadmin, redefinir a senha de Álvaro. | Não exige e-mail; senha antiga deixa de funcionar e nova permite login. |
| T15 | Como Álvaro, alterar a própria senha. Testar confirmação diferente e senha atual errada antes de concluir. | Erros são informados; com dados corretos a senha muda e exige novo login. |
| T16 | Entrar com uma conta nova sem trocar a senha inicial. | Não há troca obrigatória no primeiro acesso. |
| T17 | Recarregar o app e reiniciar a API; entrar novamente. | Cadastro permanece no banco; recarregar encerra a sessão em memória. |
| T18 | Conferir as áreas fora do escopo. | Financeiro provisório; sem cadastro de eventos ou lançamento de frequência. |

Faça o teste de edição de permissões também com uma conta de responsável
**sem dependentes**: selecione Administrador, salve e entre novamente.
Ela deve receber acesso administrativo comum, nunca a flag de superadmin.

## 9. Testes automatizados

Terminal na pasta backend:

```bash
npm run build
npm run lint
npm test
```

Terminal na pasta frontend:

```bash
npm run typecheck
npm test
```

Para a integração real, deixe a API e o banco ligados e abra um terceiro terminal
na pasta backend. Use as credenciais atuais do superadmin do banco de teste.

Git Bash:

```bash
INTEGRATION_API_URL=http://localhost:3001 \
INTEGRATION_ADMIN_EMAIL=gestor.teste@example.com \
INTEGRATION_ADMIN_PASSWORD='SUA_SENHA_LOCAL' \
node test/access.integration.mjs
```

PowerShell:

```powershell
$env:INTEGRATION_API_URL='http://localhost:3001'
$env:INTEGRATION_ADMIN_EMAIL='gestor.teste@example.com'
$env:INTEGRATION_ADMIN_PASSWORD='SUA_SENHA_LOCAL'
node test/access.integration.mjs
```

O .env do terminal de teste deve apontar para o **mesmo banco da API**.
O script cria registros com identificador único e remove seus próprios dados
ao terminar; os cadastros manuais permanecem.
Na validação desta entrega foram aprovados 30 testes de backend, 24 de frontend
e 41 requisições de integração, com verificação de persistência e hash.
Uma execução nova só é aprovada se terminar sem falhas.

## 10. Diagnóstico rápido

| Sintoma | Verificação |
| --- | --- |
| EADDRINUSE na porta 3001 ou 8081 | Há outra execução. Encerre a execução correspondente com Ctrl+C; não inicie duas na mesma porta. |
| API não conecta ao PostgreSQL | Banco saudável, porta/usuário/senha/nome corretos; host 127.0.0.1 para API fora do Docker. |
| Login inválido com SUPERADMIN_PASSWORD recém-editada | O seed não troca senha de conta existente. Use a senha atual ou uma conta nova de teste. |
| Conta não aparece como superadmin | SUPERADMIN_EMAIL correto e conta existente ativa com perfil Administrador; reinicie a API. |
| Funciona no PC, mas não no celular | IP real no .env.local, API acessível pelo celular, mesma rede e Expo reiniciado. |
| Erro de CORS no navegador | Use localhost:8081 ou configure a origem exata em CORS_ORIGINS e reinicie a API. Expo Go nativo não usa a política CORS do navegador. |
| Expo Go incompatível | Verifique a mensagem de compatibilidade com o SDK do projeto; não altere as dependências apenas para ocultar o erro. |
| Dados desapareceram da sessão ao recarregar | Faça login novamente. Sessão em memória é diferente de persistência no banco. |

## 11. Registrar o resultado

Copie este modelo para a descrição do teste ou comentário no PR:

```text
Commit testado:
Data:
Responsável pelo teste:
Ambiente: navegador / Android / iOS
Versões de Node e Expo Go (quando aplicável):
Banco local de desenvolvimento:
Cenários aprovados:
Cenários reprovados:
Testes automatizados: comando e resultado
Passos para reproduzir eventual falha:
Resultado esperado:
Resultado observado:
Evidências: captura ou trecho do erro, sem senhas/tokens
```

Ao terminar, use Ctrl+C nos terminais do frontend e backend.
Para parar somente o banco, na raiz:
`docker compose --env-file backend/.env stop db`.
O volume e os cadastros permanecem para a próxima execução.
