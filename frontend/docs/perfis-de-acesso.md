# Cadastro unificado de perfis e permissões

## Executar a demonstração

Na pasta `frontend`, execute `npm ci` e `npm start`, e abra no Expo Go
compatível com o SDK do projeto. O seletor de demonstração aparece somente em
desenvolvimento (`__DEV__`). Ele não é uma tela de login.

Há quatro acessos de exemplo: **Superadmin · Gestor do Projeto**, Administrador ·
Ana Coordenadora, Responsável · Paulo José e Atleta · Anna Beatryz. Alunos menores
não aparecem nesse seletor, pois não possuem conta própria. As contas novas e
ativas aparecem ao sair do perfil atual. Recarregar o aplicativo restaura os dados.

## Cadastro único

Todos os cadastros começam em **Gerenciamento de Contas → Novo perfil**, acessível
apenas ao superadmin. Foram removidos o botão, a rota, a tela e a operação separados
de cadastro de atleta.

| Função selecionada         | Resultado                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Administrador              | Cria conta comum de administrador e gera senha inicial. Não concede a flag de superadmin.                      |
| Responsável                | Cria conta e gera senha inicial, sem exigir dependentes no momento do cadastro.                                |
| Atleta com 18 anos ou mais | Cria conta própria e cadastro de aluno na mesma operação; gera a senha inicial.                                |
| Atleta menor de 18 anos    | Cadastra somente o aluno, exige turma e responsável ativo já cadastrado; não cria conta ou senha para o menor. |

A idade é calculada a partir do nascimento completo, que continua necessário para
a RN015. O limite de **18 anos completos** foi confirmado pelo usuário.

Para um menor, não há criação de responsável dentro do formulário de atleta. Se não
existir responsável ativo, o formulário orienta a cadastrá-lo primeiro pelo mesmo
fluxo de perfis. Ao vincular um menor, a senha do responsável existente permanece
inalterada.

A lista de Gerenciamento de Contas inclui todas as contas e os alunos sem acesso
próprio. Para estes, exibe o responsável e não oferece redefinição de senha.
Inativação de conta revoga o acesso local; inativação de aluno sem conta altera
somente sua matrícula, não o acesso de seu responsável.

## Permissões

| Ação                                     | Superadmin | Administrador | Atleta / Responsável      |
| ---------------------------------------- | ---------- | ------------- | ------------------------- |
| Criar, editar, ativar e inativar perfis  | Sim        | Não           | Não                       |
| Redefinir senha de outra conta           | Sim        | Não           | Não                       |
| Alterar a própria senha                  | Sim        | Sim           | Sim                       |
| Consultar turmas, alunos e frequência    | Sim        | Sim           | Somente o próprio vínculo |
| Acessar a área financeira                | Sim        | Não           | Não                       |
| Acessar a área administrativa de eventos | Sim        | Não           | Não                       |
| Ver eventos compartilhados no início     | Sim        | Sim           | Sim                       |

A barra do superadmin mantém Início, Contas, Financeiro, Turmas e Eventos.
Alunos e Frequência também são acessíveis pelas ações da tela inicial.
A barra do administrador contém Início, Turmas, Alunos e Frequência.
As rotas restritas não são registradas para o administrador comum. As operações
de dados também verificam permissão; não dependem apenas de esconder botões.

Turmas, alunos e frequência são telas de **consulta**. A frequência e a agenda
continuam com dados de exemplo de setembro de 2026. O financeiro permanece uma
tela provisória. O cadastro real de eventos ainda não foi implementado; quando
for integrado, será exclusivo do superadmin.

## Superadmin e backend

A conta de superadmin será provisionada diretamente no banco de dados, com
`role: "admin"` e `isSuperAdmin: true`. Não existe opção para criar ou promover
superadmin pela interface. Todo perfil novo recebe `isSuperAdmin: false`, mesmo
que um payload externo tente inserir a flag. Editar os dados pessoais preserva a
flag original. Trocar a função ou inativar o superadmin pelo formulário é bloqueado.

**Esta implementação é de frontend com um adaptador de demonstração em memória.**
Não foi criada uma conta em banco de dados. A entrada de superadmin em
`fixtures.ts` é fictícia e existe apenas para conferir as telas.

A integração de login precisa trazer a flag confiável na sessão. O backend precisa
repetir as validações de perfil, idade, vínculo e permissões, e provisionar o
superadmin via seed/migration do banco. A flag enviada pelo cliente nunca deve ser
aceita como fonte de autorização. Criar conta e aluno deve ser uma transação no
servidor para evitar cadastros parciais.

## RN015

Senha inicial: três primeiros caracteres do nome do **titular**, sem acentos e
preservando maiúsculas/minúsculas, seguidos do nascimento em `DDMMAAAA`.
Exemplo: `Álvaro Silva`, `05/09/2004` → `Alv05092004`.

Aplica-se às novas contas de administrador, responsável e atleta adulto. Menor
não recebe senha. Editar dados pessoais ou vincular dependente não regenera senha.
A alteração após o primeiro acesso é opcional. Primeiro nome com menos de três
caracteres continua bloqueado na demonstração até que a regra de preenchimento
seja definida.

Os formulários de alteração/redefinição validam os campos, mas **não persistem
credenciais nem autenticam**. A mensagem de conclusão explicita essa limitação.

## Edição e preservação dos vínculos

- Alterar um responsável de aluno remove o vínculo anterior e atualiza a visibilidade.
- Ao atualizar um aluno para 18 anos ou mais, o superadmin pode salvar o perfil:
  cria-se a conta, preservando matrícula e histórico. Apenas fazer aniversário não
  executa automaticamente o cadastro; depende de salvar o perfil.
- Se o nascimento for corrigido para menor de idade, exige responsável, remove
  a conta própria e mantém o aluno.
- Mudar a função de uma conta não exclui matrícula/frequência já existentes.
- Responsável com alunos vinculados precisa reatribuí-los antes de mudar de função.
- E-mails de acesso são únicos, inclusive entre contas inativas. E-mail de menor
  é contato opcional, não identificador de login.
- A troca de responsável exige que a conta selecionada esteja ativa.

## Organização

- `src/components/ui.tsx`: componentes visuais e estilos compartilhados.
- `src/components/access.tsx`: barra por permissão e cartões de eventos Material Design.
- `src/features/access/types.ts`: contas, alunos, formulário de perfil e rotas.
- `src/features/access/domain.ts`: RN015, datas, contatos e permissões.
- `src/features/access/profiles.ts`: transações puras de cadastro/edição, vínculos e visibilidade.
- `src/features/access/fixtures.ts`: dados fictícios.
- `src/features/access/AccessContext.tsx`: sessão e adaptador local a substituir pela API.
- `src/screens/AccountFormScreen.tsx`: formulário único de perfis.
- `src/screens/AccountsScreen.tsx`: lista de contas e alunos sem conta.
- `src/screens/ReferenceScreens.tsx`: consultas de turmas, alunos, frequência e áreas futuras.
- `src/routes/index.tsx`: rotas condicionadas às permissões da sessão.

O logo AS e a tipografia continuam provisórios. O layout mantém fundo cinza,
cartões brancos e botões pretos dos prints. Não há CSS global: os estilos são
objetos de React Native aplicados explicitamente.

## Verificação

`npm run typecheck` verifica TypeScript. `npm test` roda os testes com Node.js
22.6+ sem dependências adicionais. Os testes cobrem geração de senha, idade limite,
cadastro atômico, vínculo obrigatório com responsável existente, contas duplicadas,
edição, troca de responsável, correção de idade, bloqueios de administrador comum,
proteção da flag de superadmin e visibilidade por perfil.

Roteiro manual:

1. Entrar como superadmin, abrir Gerenciamento de Contas e cadastrar um responsável.
2. Cadastrar atleta menor e selecionar esse responsável. Conferir ausência de senha.
3. Cadastrar atleta com 18 anos completos e conferir conta, aluno e senha inicial.
4. Cadastrar administrador. Sair, entrar nessa conta e conferir acesso a Turmas,
   Alunos e Frequência, sem Contas, Financeiro ou administração de Eventos.
5. Entrar como responsável e conferir somente os dependentes vinculados.
6. Editar o responsável de um menor e conferir a remoção do acesso do antigo titular.
7. Conferir a ausência de qualquer botão, tela ou fluxo independente “Novo atleta”.
8. Conferir rolagem, teclado e legibilidade no dispositivo.

A geração do bundle Android não substitui a verificação visual no celular.
