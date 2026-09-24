//RN015 (Geração de Senha Inicial)
export function generateInitialPassword(name: string, birthDate: Date): string {
  const namePrefix = name.trim().slice(0, 3).toLowerCase();
  const day = String(birthDate.getUTCDate()).padStart(2, '0');
  const month = String(birthDate.getUTCMonth() + 1).padStart(2, '0');
  const year = birthDate.getUTCFullYear();
  return `${namePrefix}${day}${month}${year}`;
}
