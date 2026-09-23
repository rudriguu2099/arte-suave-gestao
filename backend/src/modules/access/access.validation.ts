import { BadRequestException } from '@nestjs/common';

export function birthDateToIso(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match)
    throw new BadRequestException('Informe o nascimento em DD/MM/AAAA.');
  const [, day, month, year] = match;
  const iso = year + '-' + month + '-' + day;
  const date = new Date(iso + 'T00:00:00Z');
  if (
    +year < 1900 ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso ||
    date > new Date()
  ) {
    throw new BadRequestException('Data de nascimento inválida.');
  }
  return iso;
}
export function ageOn(iso: string, today = new Date()): number {
  const date = new Date(iso + 'T00:00:00Z');
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  if (
    today.getUTCMonth() < date.getUTCMonth() ||
    (today.getUTCMonth() === date.getUTCMonth() &&
      today.getUTCDate() < date.getUTCDate())
  )
    age--;
  return age;
}
export function displayDate(value: Date | string): string {
  const iso =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  return iso.split('-').reverse().join('/');
}
