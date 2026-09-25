export const LIMITE_SENHA = 16;

export function validarObrigatorio(valor: string, nomeCampo: string): string | null {
  if (!valor.trim()) {
    return `${nomeCampo} é obrigatório.`;
  }
  return null;
}

export function emailValido(valor: string): string | null {
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(valor.trim())) {
    return 'Digite um e-mail válido.';
  }
  return null
}

export function senhaValida(valor: string, tamanhoMinimo = 6): string | null {
  const senha = valor;
  if (senha.length > LIMITE_SENHA) return `A senha deve ter no máximo ${LIMITE_SENHA} caracteres.`;

  if (senha.length < tamanhoMinimo) return `A senha precisa ter pelo menos ${tamanhoMinimo} caracteres.`;
  if (!/[A-Z]/.test(senha)) return 'A senha precisa de uma letra maiúscula.';
  if (!/[a-z]/.test(senha)) return 'A senha precisa de uma letra minúscula.';
  if (!/[0-9]/.test(senha)) return 'A senha precisa de um número.';
  if (!/[^A-Za-z0-9]/.test(senha)) return 'A senha precisa de um símbolo.';

  return null;
}

export function novaSenhaValida(senha: string, confirmacao: string, atual?: string): string | null {
  return validarObrigatorio(senha, "Nova senha")
    || (atual !== undefined && senha === atual ? "A nova senha deve ser diferente da senha atual." : null)
    || senhaValida(senha)
    || (senha !== confirmacao ? "As senhas não coincidem." : null);
}

export function telefoneValido(valor: string): string | null {
  return /^(?:\d{10,11}|\(\d{2}\) \d{4,5}-\d{4})$/.test(valor)
    ? null : "Informe um telefone com DDD e 10 ou 11 dígitos.";
}

export function formatarTelefone(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return numeros;
  const local = numeros.slice(2);
  const corte = local.length > 8 ? 5 : 4;
  return "(" + numeros.slice(0, 2) + ") " + local.slice(0, corte)
    + (local.length > corte ? "-" + local.slice(corte) : "");
}

export function validarEmailUnico(emails: string[]): string | null {
  return emails.filter((email) => email.trim()).length > 1
    ? "Informe apenas um e-mail por perfil." : null;
}
