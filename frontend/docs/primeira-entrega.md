# Primeira entrega — perfis de acesso e integração

## Objetivo e situação

Entrega do fluxo unificado de perfis em React Native/Expo, integrado ao login
da equipe, à API NestJS e ao PostgreSQL. O responsável pela entrega informou
que concluiu os testes manuais do sistema com sucesso.

Este documento descreve o código presente nesta branch; não representa uma
publicação em produção ou uma versão já incorporada à develop.
Para reproduzir os testes, consulte [o roteiro da equipe](./testes-primeira-entrega.md).
Para detalhes da integração, consulte [perfis de acesso](./perfis-de-acesso.md).

## Funcionalidades entregues

- Login real, sessão autenticada e tela inicial conforme o perfil.
- Gerenciamento unificado de contas e alunos: criar, editar, ativar e inativar.
- Cadastro de administrador comum e responsável com conta própria.
- Cadastro de atleta com 18 anos completos ou mais: conta e aluno na mesma operação.
- Cadastro de menor: somente aluno, vinculado a responsável ativo já existente.
- Geração da senha inicial no servidor, conforme a função já existente no backend.
- Redefinição da senha de outra conta pelo superadmin, sem confirmação por e-mail.
- Alteração opcional da própria senha, informando a senha atual.
- Consulta de turmas, alunos e frequência com dados persistidos.
- Navegação com ícones Material Design, incluindo financeiro para superadmin.

Não há autocadastro nem fluxo separado de “Cadastrar atleta”. O ponto de entrada
é **Gerenciamento de Contas → Novo perfil**.

## Perfis e permissões

Superadmin não é uma quarta opção de perfil no formulário. É uma conta de
administrador com a flag `users.isSuperAdmin = true`, provisionada pelo servidor.

| Operação | Superadmin | Administrador comum | Responsável / atleta |
| --- | --- | --- | --- |
| Gerenciar contas e perfis | Sim | Não | Não |
| Redefinir senha de outra conta | Sim | Não | Não |
| Alterar a própria senha | Sim | Sim | Sim |
| Consultar alunos, turmas e frequência | Sim | Sim | Apenas o próprio vínculo |
| Acessar a área financeira | Sim, tela provisória | Não | Não |
| Acessar a área administrativa de eventos | Sim, sem cadastro implementado | Não | Não |

A flag não pode ser concedida pelo formulário ou por um campo enviado pelo
cliente. O backend verifica permissões; esconder botões não é a única proteção.
O responsável vê somente os alunos vinculados, e o atleta vê seu próprio vínculo.
O menor não recebe credenciais. Vinculá-lo não altera a senha do responsável.

## Regra de senha mantida

Por decisão final da entrega, foi preservada a função que já estava no backend:

```ts
name.trim().slice(0, 3).toLowerCase() + DDMMAAAA
```

O nome e o nascimento são do titular da conta. O prefixo fica em minúsculas
e mantém acentos. Exemplo: Álvaro, 05/09/1980 → `álv05091980`.
Não foi aplicada a proposta anterior de remover acentos e preservar maiúsculas.

A geração ocorre ao criar uma conta. Editar nome ou nascimento não regenera senha.
A mudança após o primeiro acesso continua opcional. A senha é armazenada como
hash bcrypt; a interface apresenta a senha inicial para entrega ao titular.
O provisionamento inicial do superadmin usa a senha configurada no servidor.

## Relação com as histórias

| História / requisito | Atendimento nesta entrega |
| --- | --- |
| HU001 / RF01 | Três perfis e visualizações restritas, com flag de superadmin. |
| HU003 / RF03 | Redefinição sem e-mail pela gestão de contas, exclusiva do superadmin conforme o ajuste de escopo. |
| HU004 / RF04 | Criação, edição, ativação e inativação no cadastro unificado, exclusivas do superadmin. |
| HU005 / RF04 | Seleção da função Administrador no cadastro/edição; concede administração comum, não a flag. |
| HU006 / RF05 / RN015 | Senha inicial automática com a composição preservada do backend. |
| HU007 / RF05 | Alteração voluntária da própria senha, sem obrigatoriedade no primeiro acesso. |

As permissões acima refletem a atualização de escopo solicitada durante o
desenvolvimento: gestão de contas foi reservada ao superadmin. O texto inicial
das HUs mencionava Administrador; a equipe deve manter essa atualização também
no backlog para que os critérios de aceite correspondam à entrega.

## Organização técnica

| Área | Responsabilidade |
| --- | --- |
| `frontend/src/components/ui.tsx` | Campos, botões, seletores, cartões, mensagens e diálogos reutilizáveis. |
| `frontend/src/components/access.tsx` | Navegação por perfil e apresentação de eventos. |
| `frontend/src/screens/` | Login, início, gerenciamento, formulário e senhas. |
| `frontend/src/features/access/AccessContext.tsx` | Sessão e sincronização dos dados com a API. |
| `frontend/src/services/api.ts` e `accessApi.ts` | Requisições, token, erros e contratos de integração. |
| `backend/src/modules/access/` | Cadastro transacional, vínculos, consulta e autorização. |
| `backend/src/modules/users/` e `auth/` | Contas, autenticação, senhas e provisionamento do superadmin. |

Os estilos são objetos de StyleSheet/componentes React Native, sem CSS global.
O login existente foi conectado à sessão da aplicação. A sessão fica em memória:
recarregar exige login, mas não apaga os cadastros no PostgreSQL.
Inativação e alteração de senha invalidam tokens anteriores.

## Validação registrada

- 24 testes de frontend aprovados e verificação TypeScript sem erros.
- 30 testes de backend aprovados, build e lint concluídos.
- Teste integrado: 41 requisições HTTP verificadas, incluindo conferência de
  persistência e hash no PostgreSQL.
- Login e navegação conferidos pelo navegador.
- Testes manuais do sistema aprovados pelo responsável pela entrega.

Esses números registram a validação realizada na integração; não indicam uma
nova execução de testes durante a redação desta documentação.

## Limites desta entrega

- Financeiro é uma tela provisória.
- Cadastro de eventos e lançamento de frequência não foram implementados.
- Não há eventos ou presenças de demonstração exibidos como dados reais.
- O catálogo inicial de três turmas é inserido quando não há turmas no banco.
- O ambiente local usa a sincronização de esquema já configurada no projeto.
  Produção requer migrações revisadas; este guia é de desenvolvimento.

## Compartilhamento com a equipe

Antes de anunciar a entrega como disponível, finalize a revisão e o merge
pendente, inclua os arquivos novos da integração e publique a branch/PR.
Não inclua arquivos `.env` ou `.env.local`.
Informe aos demais desenvolvedores o link do PR e o commit que devem testar;
não presuma que as alterações locais já estão na develop.
