import { test } from "node:test";
import assert from "node:assert/strict";
import { emailValido, senhaValida, novaSenhaValida, telefoneValido, formatarTelefone } from "../src/utils/validators.ts";
import { validateContacts, validateNewPassword } from "../src/features/access/domain.ts";

test("password boundaries, confirmation and reuse of current password", () => {
  for (const password of ["Aa1!aa", "Aa1!" + "a".repeat(12)]) {
    assert.equal(senhaValida(password), null);
    assert.doesNotThrow(() => validateNewPassword(password, password, "Old1!a"));
    assert.match(novaSenhaValida(password, password, password), /diferente/);
  }
  assert.match(senhaValida("Aa1!a"), /pelo menos/);
  assert.match(senhaValida("Aa1!" + "a".repeat(13)), /máximo 16/);
  assert.match(novaSenhaValida("Aa1!aa", "Aa1!ab"), /coincidem/);
  for (const password of ["aa1!aa", "AA1!AA", "Aa!!aa", "Aa11aa"]) assert.ok(senhaValida(password));
});

test("invalid email and phone contacts cannot pass profile submission validation", () => {
  for (const email of ["julio.email.com", "julio@", "a b@site.com", "a@@site.com"]) {
    assert.ok(emailValido(email));
    assert.throws(() => validateContacts([email], []));
  }
  assert.equal(emailValido(" julio@site.com "), null);
  for (const phone of ["889999999", "889999999999", "88999999999abc", "(88) 9999-"]) {
    assert.ok(telefoneValido(phone));
    assert.throws(() => validateContacts(["julio@site.com"], [phone]));
  }
});

test("phone mask supports landline and mobile, filters pasted text and limits digits", () => {
  assert.equal(formatarTelefone("8833334444"), "(88) 3333-4444");
  assert.equal(formatarTelefone("88999994444"), "(88) 99999-4444");
  assert.equal(formatarTelefone("abc(88) 99999-4444!!!123"), "(88) 99999-4444");
  assert.equal(formatarTelefone(""), "");
  for (const phone of ["8833334444", "88999994444", "(88) 3333-4444", "(88) 99999-4444"]) {
    assert.equal(telefoneValido(phone), null);
    assert.equal(formatarTelefone(formatarTelefone(phone)), formatarTelefone(phone));
  }
});


test("profile accepts a single email and multiple phones", () => {
  assert.throws(() => validateContacts(["a@site.com", "b@site.com"], []), /apenas um e-mail/);
  assert.doesNotThrow(() => validateContacts(["a@site.com"], ["(88) 3333-4444", "(88) 99999-4444"]));
  assert.doesNotThrow(() => validateContacts([], [], false));
  assert.throws(() => validateContacts([], [], true));
});
