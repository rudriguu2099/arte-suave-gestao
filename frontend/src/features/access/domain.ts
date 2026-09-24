import type { Account, ProfileInput } from "./types";

export function parseBirthDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    Number(year) < 1900 ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  )
    return null;
  return date;
}

export function ageOn(birthDate: string, today = new Date()): number {
  const birth = parseBirthDate(birthDate);
  if (!birth || birth > today) return -1;
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
}

export function formatBirthDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length <= 2
    ? digits
    : digits.length <= 4
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function initialPassword(name: string, birthDate: string): string {
  const prefix = name.trim().slice(0, 3).toLowerCase();
  if (ageOn(birthDate) < 0)
    throw new Error("Informe uma data de nascimento válida.");
  return (
    prefix + birthDate.replace(/\D/g, "")
  );
}

export function validateContacts(
  emails: string[],
  phones: string[],
  requireEmail = true,
) {
  if (requireEmail && !emails.some((email) => email.trim()))
    throw new Error("Informe pelo menos um e-mail.");
  if (
    emails
      .filter(Boolean)
      .some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
  ) {
    throw new Error("Confira os endereços de e-mail informados.");
  }
  const clean = emails
    .filter(Boolean)
    .map((email) => email.trim().toLowerCase());
  if (new Set(clean).size !== clean.length)
    throw new Error("Há e-mails repetidos no formulário.");
  if (
    phones
      .filter(Boolean)
      .some((phone) => !/^\d{10,13}$/.test(phone.replace(/\D/g, "")))
  ) {
    throw new Error("Informe um telefone com DDD válido.");
  }
}

export function validateAccount(
  input: ProfileInput,
  accounts: Account[],
  editingId?: string,
) {
  if (!input.name.trim()) throw new Error("Informe o nome completo.");
  if (ageOn(input.birthDate) < 0)
    throw new Error("Informe uma data de nascimento válida em DD/MM/AAAA.");
  if (input.role === "athlete" && ageOn(input.birthDate) < 18)
    throw new Error("O perfil de atleta é exclusivo para maiores de idade.");
  validateContacts(input.emails, input.phones);
  const emails = input.emails
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (
    accounts.some(
      (account) =>
        account.id !== editingId &&
        account.emails.some((email) => emails.includes(email.toLowerCase())),
    )
  ) {
    throw new Error("Já existe uma conta com um dos e-mails informados.");
  }
  if (!editingId) initialPassword(input.name, input.birthDate);
}

export function validateNewPassword(password: string, confirmation: string) {
  if (!password.trim()) throw new Error("Informe a nova senha.");
  if (password !== confirmation) throw new Error("As senhas não coincidem.");
}

export function isStaff(actor: Account | null): boolean {
  return !!actor?.active && actor.role === "admin";
}

export function isSuperAdmin(actor: Account | null): boolean {
  return isStaff(actor) && actor?.isSuperAdmin === true;
}

export function requireSuperAdmin(actor: Account | null) {
  if (!isSuperAdmin(actor))
    throw new Error("Apenas o superadmin pode gerenciar perfis e contas.");
}

export function canManageProfile(actor: Account | null, role?: Account["role"]): boolean {
  return isStaff(actor) && (role !== "admin" || isSuperAdmin(actor));
}

export function requireManageProfile(actor: Account | null, role?: Account["role"]) {
  if (!canManageProfile(actor, role))
    throw new Error("Somente administradores autorizados podem gerenciar este perfil.");
}

export function canChangePassword(
  actor: Account | null,
  accountId: string,
  targetRole?: Account["role"],
): boolean {
  return !!actor?.active && (actor.id === accountId || isSuperAdmin(actor) ||
    (targetRole !== undefined && canManageProfile(actor, targetRole)));
}
