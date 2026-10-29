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

export function formatarHora(valor: string): string {
  const numeros = valor.replace(/\D/g, "").slice(0, 4);
  return numeros.length <= 2 ? numeros : numeros.slice(0, 2) + ":" + numeros.slice(2);
}

// Mesmas regras do GroupDto/GroupsService do backend.
export function validarTurma(turma: {
  name: string;
  ageRange: string;
  level: string;
  sessions: { start: string; end: string }[];
}): string | null {
  const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
  const nome = turma.name.trim();
  if (nome.length < 2 || nome.length > 80) return "O nome da turma deve ter entre 2 e 80 caracteres.";
  if (!turma.ageRange.trim() || turma.ageRange.trim().length > 80) return "Informe a faixa etária (até 80 caracteres).";
  if (!turma.level.trim() || turma.level.trim().length > 80) return "Informe o nível técnico (até 80 caracteres).";
  if (!turma.sessions.length) return "Selecione pelo menos um dia de treino.";
  if (turma.sessions.some(({ start, end }) => !hora.test(start) || !hora.test(end)))
    return "Informe os horários no formato HH:MM.";
  if (turma.sessions.some(({ start, end }) => start >= end))
    return "O horário de término deve ser depois do início.";
  return null;
}

// Máscara de valor em reais: os dígitos digitados viram centavos (até 99.999.999,99, limite do backend).
export function formatarMoeda(valor: string): string {
  const centavos = valor.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
  if (!centavos) return "";
  const numero = centavos.padStart(3, "0");
  return numero.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + numero.slice(-2);
}

export function moedaParaNumero(valor: string): number {
  return Number(valor.replace(/\D/g, "")) / 100;
}

// Converte valor numérico (ex.: 1850.5) para máscara "1.850,50" usada nos inputs e nos cards.
export function numeroParaMoeda(valor: number): string {
  const centavos = String(Math.round(Math.abs(valor) * 100)).padStart(3, "0");
  return centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + centavos.slice(-2);
}

// Exibição em reais: "R$ 260,00" / "R$ -1.590,00" (comSinal=false) ou "+R$ 200,00" / "-R$ 350,00" (comSinal=true).
export function formatarReais(valor: number, comSinal = false): string {
  const formatado = numeroParaMoeda(valor);
  if (comSinal) return (valor < 0 ? "-R$ " : "+R$ ") + formatado;
  return valor < 0 ? `R$ -${formatado}` : `R$ ${formatado}`;
}

// Mesmas regras do FinanceService do backend (RF012/RF013/HU018); extra = forma de recebimento ou situação.
export function validarLancamento(l: {
  categoria: string;
  titulo: string;
  atleta?: string;
  doador?: string;
  destino?: string;
  beneficiado?: string;
  valor: string;
  data: string;
  extra: string;
  nomeExtra: string;
}): string | null {
  if (!l.categoria) return "Selecione a categoria.";
  if (l.categoria === "OUTROS" && !l.titulo.trim()) return "Informe o título para a categoria Outros.";
  if (l.categoria === "AJUDA_DE_CUSTO" && !l.atleta) return "Selecione o atleta para a categoria Ajuda de custo.";
  if (l.categoria === "PATROCINIO_DOACAO") {
    if (!l.doador?.trim()) return "Informe o doador ou patrocinador para a categoria Doação/Patrocínio.";
    if (!l.destino) return "Selecione o destino para a categoria Doação/Patrocínio.";
    if (l.destino === "OUTROS" && !l.beneficiado?.trim())
      return "Informe o beneficiado para a categoria Doação/Patrocínio.";
  }
  if (!(moedaParaNumero(l.valor) > 0)) return "Informe um valor maior que zero.";
  const [dia, mes, ano] = l.data.split("/").map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(l.data) || ano < 2000 || data.getMonth() !== mes - 1 || data.getDate() !== dia)
    return "Informe uma data válida (dd/mm/aaaa).";
  if (!l.extra) return `Selecione ${l.nomeExtra}.`;
  return null;
}
