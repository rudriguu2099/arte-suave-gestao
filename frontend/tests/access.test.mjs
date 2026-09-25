import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageOn,
  formatBirthDate,
  initialPassword,
  parseBirthDate,
  requireSuperAdmin,
  isStaff,
  isSuperAdmin,
  canChangePassword,
  validateAccount,
  validateContacts,
  validateNewPassword,
} from "../src/features/access/domain.ts";

const account = {
  id: "one",
  name: "Álvaro Silva",
  birthDate: "05/09/2004",
  emails: ["alvaro@example.com"],
  phones: [],
  role: "athlete",
  active: true,
  isSuperAdmin: false,
  athleteIds: [],
};
test("RN015 matches backend: lowercase, keeps accents, appends DDMMYYYY and uses account holder", () => {
  assert.equal(initialPassword("Álvaro Silva", "05/09/2004"), "álv05092004");
  assert.equal(initialPassword("  ÉRIca Souza ", "02/01/1980"), "éri02011980");
  assert.equal(initialPassword("Paulo José", "12/06/1980"), "pau12061980");
  assert.equal(
    initialPassword("Ana Coordenadora", "10/02/1985"),
    "ana10021985",
  );
  assert.equal(initialPassword("Li Souza", "05/09/2004"), "li 05092004");
});
test("real dates, leap years and exact adulthood boundary", () => {
  assert.equal(parseBirthDate("31/02/2004"), null);
  assert.equal(parseBirthDate("29/02/2023"), null);
  assert.ok(parseBirthDate("29/02/2024"));
  assert.equal(ageOn("18/09/2008", new Date(2026, 8, 17)), 17);
  assert.equal(ageOn("17/09/2008", new Date(2026, 8, 17)), 18);
  assert.equal(ageOn("17/09/2027", new Date(2026, 8, 17)), -1);
  assert.equal(formatBirthDate("05092004"), "05/09/2004");
});
test("minor cannot receive an adult athlete account", () => {
  assert.throws(
    () => validateAccount({ ...account, birthDate: "01/01/2020" }, []),
    /maiores de idade/,
  );
});
test("administrator is a selectable role without elevated privileges", () => {
  assert.doesNotThrow(() => validateAccount({ ...account, role: "admin" }, []));
});
test("duplicate emails are rejected, including inactive accounts", () => {
  assert.throws(
    () =>
      validateAccount({ ...account, emails: ["ALVARO@example.com"] }, [
        { ...account, active: false },
      ]),
    /Já existe/,
  );
  assert.doesNotThrow(() => validateAccount(account, [account], "one"));
  assert.throws(
    () => validateContacts(["a@example.com", "A@example.com"], []),
    /apenas um e-mail/,
  );
  assert.throws(() => validateContacts(["invalid"], []), /e-mail/);
});
test("only an active administrator with the database flag can manage accounts", () => {
  assert.throws(() => requireSuperAdmin(null));
  assert.throws(() => requireSuperAdmin(account));
  assert.throws(() => requireSuperAdmin({ ...account, role: "admin" }));
  assert.throws(() =>
    requireSuperAdmin({ ...account, role: "responsible", isSuperAdmin: true }),
  );
  assert.throws(() =>
    requireSuperAdmin({
      ...account,
      role: "admin",
      isSuperAdmin: true,
      active: false,
    }),
  );
  assert.doesNotThrow(() =>
    requireSuperAdmin({ ...account, role: "admin", isSuperAdmin: true }),
  );
});
test("ordinary administrators have school access but not superadmin permissions", () => {
  const admin = { ...account, role: "admin" };
  assert.equal(isStaff(admin), true);
  assert.equal(isSuperAdmin(admin), false);
  assert.equal(canChangePassword(admin, admin.id), true);
  assert.equal(canChangePassword(admin, "other"), false);
  assert.equal(
    canChangePassword({ ...admin, isSuperAdmin: true }, "other"),
    true,
  );
  assert.equal(canChangePassword({ ...admin, active: false }, admin.id), false);
});
test("new passwords must be nonempty and match", () => {
  assert.throws(() => validateNewPassword("", ""));
  assert.throws(() => validateNewPassword("senha1", "senha2"));
  assert.doesNotThrow(() =>
    validateNewPassword("MinhaNovaSenha1!", "MinhaNovaSenha1!"),
  );
});


test("ordinary admin resets only non-administrative passwords and can change own password", () => {
  const admin = { ...account, role: "admin" };
  assert.equal(canChangePassword(admin, "other", "responsible"), true);
  assert.equal(canChangePassword(admin, "other", "athlete"), true);
  assert.equal(canChangePassword(admin, "other", "admin"), false);
  assert.equal(canChangePassword(admin, admin.id, "admin"), true);
  assert.equal(canChangePassword({ ...admin, active: false }, "other", "athlete"), false);
  assert.equal(canChangePassword(account, "other", "athlete"), false);
});
