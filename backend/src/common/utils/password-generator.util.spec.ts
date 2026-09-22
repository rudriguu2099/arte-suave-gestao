import { generateInitialPassword } from './password-generator.util.js';

describe('generateInitialPassword (RN015)', () => {
  it('gera a senha com as 3 primeiras letras do nome (minúsculas) + DDMMAAAA', () => {
    expect(generateInitialPassword('Rodrigo', new Date('2002-05-15'))).toBe('rod15052002');
  });

  it('preenche dia e mês com zero à esquerda quando necessário', () => {
    expect(generateInitialPassword('Ana', new Date('2010-01-05'))).toBe('ana05012010');
  });

  it('usa apenas os 3 primeiros caracteres mesmo para nomes longos', () => {
    expect(generateInitialPassword('Alexandre', new Date('1999-12-31'))).toBe('ale31121999');
  });

  it('lida com nomes com menos de 3 caracteres', () => {
    expect(generateInitialPassword('Jo', new Date('2005-07-20'))).toBe('jo20072005');
  });

  it('ignora espaços em branco nas extremidades do nome', () => {
    expect(generateInitialPassword('  Maria  ', new Date('2000-03-09'))).toBe('mar09032000');
  });
});
