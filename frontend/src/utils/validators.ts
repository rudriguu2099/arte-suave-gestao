export function validarObrigatorio(valor: string, nomeCampo: string): string | null {
  if (!valor.trim()) {
    return `${nomeCampo} é obrigatório.`;
  }
  return null;
}

export function emailValido(valor: string): string | null {
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(valor)) {
    return 'Digite um e-mail válido.';
  }
  return null
}

export function senhaValida(valor: string, tamanhoMinimo = 6): string | null {
  const senha = valor.trim();

  if (senha.length < tamanhoMinimo) return `A senha precisa ter pelo menos ${tamanhoMinimo} caracteres.`;
  if (!/[A-Z]/.test(senha)) return 'A senha precisa de uma letra maiúscula.';
  if (!/[a-z]/.test(senha)) return 'A senha precisa de uma letra minúscula.';
  if (!/[0-9]/.test(senha)) return 'A senha precisa de um número.';
  if (!/[^A-Za-z0-9]/.test(senha)) return 'A senha precisa de um símbolo.';

  return null;
}