import {
  ageOn,
  initialPassword,
  isStaff,
  requireManageProfile,
  validateAccount,
  validateContacts,
} from "./domain.ts";
import type {
  Account,
  Athlete,
  Group,
  ProfileInput,
  ProfileResult,
  ProfileState,
  ProfileTarget,
} from "./types";

let sequence = 0;
const nextId = () => `local-${Date.now()}-${++sequence}`;

// Derive links from the student records so changing guardians cannot leave stale access.
function syncLinks(state: ProfileState): ProfileState {
  return {
    ...state,
    accounts: state.accounts.map((account) => ({
      ...account,
      athleteIds: state.athletes
        .filter((athlete) =>
          account.role === "responsible"
            ? athlete.guardianId === account.id
            : account.role === "athlete" && athlete.accountId === account.id,
        )
        .map((athlete) => athlete.id),
    })),
  };
}

export function findProfile(state: ProfileState, target?: ProfileTarget) {
  if (!target) return {} as { account?: Account; athlete?: Athlete };
  if (target.accountId && target.athleteId)
    throw new Error("Selecione apenas um perfil.");
  if (target.accountId) {
    const account = state.accounts.find((item) => item.id === target.accountId);
    if (!account) throw new Error("Conta não encontrada.");
    return {
      account,
      athlete: state.athletes.find((item) => item.accountId === account.id),
    };
  }
  const athlete = state.athletes.find((item) => item.id === target.athleteId);
  if (!athlete) throw new Error("Aluno não encontrado.");
  return {
    athlete,
    account: state.accounts.find((item) => item.id === athlete.accountId),
  };
}

/** Pure transaction used by the demo adapter. The API must enforce the same rules. */
export function saveProfile(
  state: ProfileState,
  actorId: string | null,
  raw: ProfileInput,
  groups: Group[],
  target?: ProfileTarget,
): { state: ProfileState; result: ProfileResult } {
  const actor = state.accounts.find((account) => account.id === actorId) ?? null;
  requireManageProfile(actor);
  // Explicit allow-list: never copy isSuperAdmin (or an id/active flag) from a form payload.
  const input: ProfileInput = {
    name: raw.name.trim(),
    birthDate: raw.birthDate,
    role: raw.role,
    emails: raw.emails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    phones: raw.phones.map((phone) => phone.trim()).filter(Boolean),
    groupId: raw.groupId,
    guardianId: raw.guardianId,
  };
  if (!["admin", "athlete", "responsible"].includes(input.role))
    throw new Error("Selecione uma função válida.");
  if (!input.name) throw new Error("Informe o nome completo.");
  const age = ageOn(input.birthDate);
  if (age < 0)
    throw new Error("Informe uma data de nascimento válida em DD/MM/AAAA.");
  const { account: existing, athlete: student } = findProfile(state, target);
  requireManageProfile(actor, existing?.role);
  requireManageProfile(actor, input.role);
  if (existing?.isSuperAdmin && input.role !== "admin")
    throw new Error("O perfil do superadmin é definido no banco de dados.");
  if (
    existing?.role === "responsible" &&
    input.role !== "responsible" &&
    state.athletes.some((item) => item.guardianId === existing.id)
  ) {
    throw new Error(
      "Reatribua os alunos vinculados antes de mudar a função deste responsável.",
    );
  }
  const minor = input.role === "athlete" && age < 18;
  if (input.role === "athlete") {
    if (!groups.some((group) => group.id === input.groupId))
      throw new Error("Selecione uma turma.");
    if (
      minor &&
      !state.accounts.some(
        (account) =>
          account.id === input.guardianId &&
          account.role === "responsible" &&
          account.active,
      )
    ) {
      throw new Error("Selecione um responsável ativo já cadastrado.");
    }
  }
  validateContacts(input.emails, input.phones, !minor);
  if (!minor) validateAccount(input, state.accounts, existing?.id);
  let accounts = [...state.accounts];
  let athletes = [...state.athletes];
  let accountId: string | undefined;
  let password: string | undefined;
  if (minor) {
    // If a birth date is corrected to a minor's date, revoke that person's old login.
    accounts = accounts.filter((account) => account.id !== existing?.id);
  } else {
    accountId = existing?.id ?? nextId();
    if (!existing) password = initialPassword(input.name, input.birthDate);
    const account: Account = {
      id: accountId,
      name: input.name,
      birthDate: input.birthDate,
      emails: input.emails,
      phones: input.phones,
      role: input.role,
      active: existing?.active ?? true,
      isSuperAdmin: existing?.isSuperAdmin ?? false,
      athleteIds: existing?.athleteIds ?? [],
    };
    accounts = existing
      ? accounts.map((item) => (item.id === existing.id ? account : item))
      : [...accounts, account];
  }
  if (input.role === "athlete") {
    const athlete: Athlete = {
      id: student?.id ?? nextId(),
      name: input.name,
      birthDate: input.birthDate,
      emails: input.emails,
      phones: input.phones,
      groupId: input.groupId!,
      belt: student?.belt ?? "Branca",
      attendance: student?.attendance ?? [],
      active: student?.active ?? true,
      accountId,
      guardianId: minor ? input.guardianId : undefined,
    };
    athletes = student
      ? athletes.map((item) => (item.id === student.id ? athlete : item))
      : [...athletes, athlete];
  } else if (student) {
    // Changing access roles must not delete the person's enrollment or attendance history.
    athletes = athletes.map((item) =>
      item.id === student.id
        ? {
            ...item,
            name: input.name,
            birthDate: input.birthDate,
            emails: input.emails,
            phones: input.phones,
            accountId,
            guardianId: undefined,
          }
        : item,
    );
  }
  return {
    state: syncLinks({ accounts, athletes }),
    result: { name: input.name, password, hasAccess: !minor },
  };
}

export function toggleProfileActive(
  state: ProfileState,
  actorId: string | null,
  target: ProfileTarget,
): ProfileState {
  const actor = state.accounts.find((account) => account.id === actorId) ?? null;
  requireManageProfile(actor);
  const { account, athlete } = findProfile(state, target);
  requireManageProfile(actor, account?.role);
  if (account?.isSuperAdmin)
    throw new Error("O acesso do superadmin é gerenciado no banco de dados.");
  if (account)
    return {
      ...state,
      accounts: state.accounts.map((item) =>
        item.id === account.id ? { ...item, active: !item.active } : item,
      ),
    };
  return {
    ...state,
    athletes: state.athletes.map((item) =>
      item.id === athlete!.id ? { ...item, active: !item.active } : item,
    ),
  };
}

export function visibleData(
  state: ProfileState,
  current: Account | null,
): ProfileState {
  if (!current?.active) return { accounts: [], athletes: [] };
  return {
    accounts: isStaff(current) ? state.accounts : [current],
    athletes: isStaff(current)
      ? state.athletes
      : state.athletes.filter((athlete) =>
          current.role === "responsible"
            ? athlete.guardianId === current.id
            : current.role === "athlete" && athlete.accountId === current.id,
        ),
  };
}

export function profileRows(state: ProfileState) {
  return [
    ...state.accounts.map((account) => ({
      key: `account-${account.id}`,
      name: account.name,
      emails: account.emails,
      role: account.role,
      active: account.active,
      isSuperAdmin: account.isSuperAdmin,
      hasAccess: true,
      target: { accountId: account.id } as ProfileTarget,
      accountId: account.id,
      guardianName: undefined as string | undefined,
    })),
    ...state.athletes
      .filter((athlete) => !athlete.accountId)
      .map((athlete) => ({
        key: `athlete-${athlete.id}`,
        name: athlete.name,
        emails: athlete.emails,
        role: "athlete" as const,
        active: athlete.active,
        isSuperAdmin: false,
        hasAccess: false,
        accountId: undefined,
        target: { athleteId: athlete.id } as ProfileTarget,
        guardianName: state.accounts.find(
          (account) => account.id === athlete.guardianId,
        )?.name,
      })),
  ];
}
