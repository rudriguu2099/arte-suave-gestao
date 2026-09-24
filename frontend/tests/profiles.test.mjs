import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveProfile,
  toggleProfileActive,
  profileRows,
  visibleData,
} from "../src/features/access/profiles.ts";
import {
  seedAccounts,
  seedAthletes,
  groups,
} from "../src/features/access/fixtures.ts";

const fresh = () =>
  structuredClone({ accounts: seedAccounts, athletes: seedAthletes });
const input = (overrides = {}) => ({
  name: "Álvaro Silva",
  birthDate: "05/09/2004",
  emails: ["alvaro@example.com"],
  phones: [],
  role: "athlete",
  groupId: "adult",
  ...overrides,
});
const minor = (overrides = {}) =>
  input({
    name: "Joana Silva",
    birthDate: "01/01/2020",
    emails: [],
    groupId: "child",
    guardianId: "responsible",
    ...overrides,
  });
const save = (state, value, target) =>
  saveProfile(state, "superadmin", value, groups, target);

test("adult profile atomically creates login and student, with RN015 password", () => {
  const before = fresh();
  const { state, result } = save(before, input());
  assert.equal(state.accounts.length, before.accounts.length + 1);
  assert.equal(state.athletes.length, before.athletes.length + 1);
  const account = state.accounts.at(-1);
  const athlete = state.athletes.at(-1);
  assert.equal(athlete.accountId, account.id);
  assert.deepEqual(account.athleteIds, [athlete.id]);
  assert.equal(account.isSuperAdmin, false);
  assert.equal(result.password, "álv05092004");
  assert.equal(result.hasAccess, true);
  assert.equal(before.accounts.length, seedAccounts.length);
});
test("exactly 18 years old receives own account", () => {
  const today = new Date();
  const birthday =
    String(today.getDate()).padStart(2, "0") +
    "/" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "/" +
    (today.getFullYear() - 18);
  assert.equal(
    save(fresh(), input({ birthDate: birthday })).result.hasAccess,
    true,
  );
});
test("minor creates only a student and links an existing guardian without generating any password", () => {
  const before = fresh();
  const { state, result } = save(before, minor());
  assert.equal(state.accounts.length, before.accounts.length);
  assert.equal(state.athletes.length, before.athletes.length + 1);
  const athlete = state.athletes.at(-1);
  assert.equal(athlete.accountId, undefined);
  assert.equal(athlete.guardianId, "responsible");
  assert.equal(result.hasAccess, false);
  assert.equal(result.password, undefined);
  assert.ok(
    state.accounts
      .find((account) => account.id === "responsible")
      .athleteIds.includes(athlete.id),
  );
  assert.ok(
    profileRows(state).find(
      (row) => row.target.athleteId === athlete.id && !row.hasAccess,
    ),
  );
});
test("minor requires an existing active responsible, rejects forged or administrative guardian", () => {
  for (const guardianId of [
    undefined,
    "",
    "missing",
    "admin",
    "athlete",
    "superadmin",
  ]) {
    assert.throws(
      () => save(fresh(), minor({ guardianId })),
      /responsável ativo/,
    );
  }
  const state = fresh();
  state.accounts.find((account) => account.id === "responsible").active = false;
  assert.throws(() => save(state, minor()), /responsável ativo/);
});
test("responsible profile creates only an account, without needing students or groups", () => {
  const before = fresh();
  const { state, result } = save(
    before,
    input({ role: "responsible", groupId: undefined }),
  );
  assert.equal(state.accounts.length, before.accounts.length + 1);
  assert.equal(state.athletes.length, before.athletes.length);
  assert.deepEqual(state.accounts.at(-1).athleteIds, []);
  assert.equal(result.password, "álv05092004");
});
test("administrator profile never gets the superadmin flag, even with a forged payload", () => {
  const { state } = save(
    fresh(),
    input({
      role: "admin",
      isSuperAdmin: true,
      active: false,
      id: "superadmin",
    }),
  );
  const account = state.accounts.at(-1);
  assert.equal(account.role, "admin");
  assert.equal(account.isSuperAdmin, false);
  assert.equal(account.active, true);
  assert.notEqual(account.id, "superadmin");
  assert.equal(state.accounts.filter((item) => item.isSuperAdmin).length, 1);
  assert.throws(
    () => save(fresh(), input({ role: "superadmin" })),
    /função válida/,
  );
});
test("non-administrators cannot create, edit or change activation", () => {
  const state = fresh();
  for (const actorId of [null, "responsible", "athlete", "inactive"]) {
    assert.throws(
      () => saveProfile(state, actorId, input(), groups),
      /administradores/,
    );
    assert.throws(
      () =>
        saveProfile(state, actorId, input(), groups, { accountId: "admin" }),
      /administradores/,
    );
    assert.throws(
      () => toggleProfileActive(state, actorId, { accountId: "athlete" }),
      /administradores/,
    );
  }
  state.accounts.find((account) => account.id === "superadmin").active = false;
  assert.throws(
    () => saveProfile(state, "superadmin", input(), groups),
    /administradores/,
  );
});
test("database superadmin flag survives edits and cannot be demoted or deactivated through UI", () => {
  const state = fresh();
  const root = state.accounts.find((account) => account.id === "superadmin");
  const updated = save(
    state,
    { ...root, isSuperAdmin: false, name: "Gestor Atualizado" },
    { accountId: root.id },
  );
  assert.equal(
    updated.state.accounts.find((account) => account.id === root.id)
      .isSuperAdmin,
    true,
  );
  assert.throws(
    () => save(state, { ...root, role: "responsible" }, { accountId: root.id }),
    /banco de dados/,
  );
  assert.throws(
    () => toggleProfileActive(state, root.id, { accountId: root.id }),
    /banco de dados/,
  );
});
test("moving a minor to a different guardian revokes the previous visibility", () => {
  let state = save(fresh(), input({ role: "responsible" })).state;
  const newGuardian = state.accounts.at(-1);
  state = save(
    state,
    minor({
      name: "João Neto",
      birthDate: "10/03/2016",
      guardianId: newGuardian.id,
    }),
    { athleteId: "joao" },
  ).state;
  const oldGuardian = state.accounts.find(
    (account) => account.id === "responsible",
  );
  assert.equal(visibleData(state, oldGuardian).athletes.length, 0);
  assert.deepEqual(
    visibleData(
      state,
      state.accounts.find((account) => account.id === newGuardian.id),
    ).athletes.map((athlete) => athlete.id),
    ["joao"],
  );
  assert.deepEqual(oldGuardian.athleteIds, []);
});
test("editing a student to adulthood creates access once and keeps enrollment and attendance", () => {
  const before = fresh();
  const updated = save(before, input({ name: "João Neto", groupId: "adult" }), {
    athleteId: "joao",
  });
  assert.equal(updated.state.athletes.length, before.athletes.length);
  const student = updated.state.athletes.find(
    (athlete) => athlete.id === "joao",
  );
  assert.ok(student.accountId);
  assert.equal(student.guardianId, undefined);
  assert.deepEqual(
    student.attendance,
    before.athletes.find((athlete) => athlete.id === "joao").attendance,
  );
  assert.ok(updated.result.password);
  const again = save(
    updated.state,
    input({ name: "João Neto", groupId: "adult" }),
    { athleteId: "joao" },
  );
  assert.equal(again.result.password, undefined);
  assert.equal(again.state.accounts.length, updated.state.accounts.length);
  assert.deepEqual(
    again.state.accounts.find((account) => account.id === "responsible")
      .athleteIds,
    [],
  );
});
test("correcting an adult to a minor revokes login and creates no duplicate student", () => {
  const before = fresh();
  const { state, result } = save(before, minor({ name: "Anna Beatryz" }), {
    accountId: "athlete",
  });
  assert.equal(
    state.accounts.some((account) => account.id === "athlete"),
    false,
  );
  assert.equal(state.athletes.length, before.athletes.length);
  assert.equal(
    state.athletes.find((athlete) => athlete.id === "anna").guardianId,
    "responsible",
  );
  assert.equal(result.hasAccess, false);
});
test("invalid transactions do not partially create accounts or students", () => {
  const state = fresh();
  const snapshot = structuredClone(state);
  for (const value of [
    input({ groupId: "invalid" }),
    input({ emails: ["ana@artesuave.com"] }),
    input({ birthDate: "31/02/2000" }),
    minor({ guardianId: "missing" }),
  ]) {
    assert.throws(() => save(state, value));
    assert.deepEqual(state, snapshot);
  }
});
test("editing account changes its linked student without duplicating either", () => {
  const state = fresh();
  const { state: updated, result } = save(
    state,
    input({ name: "Anna Atualizada", emails: ["anna.nova@example.com"] }),
    { accountId: "athlete" },
  );
  assert.equal(updated.accounts.length, state.accounts.length);
  assert.equal(updated.athletes.length, state.athletes.length);
  assert.equal(
    updated.athletes.find((athlete) => athlete.id === "anna").name,
    "Anna Atualizada",
  );
  assert.equal(result.password, undefined);
});
test("student access and account management visibility match each profile", () => {
  const state = fresh();
  const current = (id) => state.accounts.find((account) => account.id === id);
  assert.equal(
    visibleData(state, current("superadmin")).accounts.length,
    state.accounts.length,
  );
  assert.deepEqual(
    visibleData(state, current("admin")).accounts.map((account) => account.id),
    state.accounts.map((account) => account.id),
  );
  assert.equal(
    visibleData(state, current("admin")).athletes.length,
    state.athletes.length,
  );
  assert.deepEqual(
    visibleData(state, current("athlete")).athletes.map(
      (athlete) => athlete.id,
    ),
    ["anna"],
  );
  assert.deepEqual(
    visibleData(state, current("responsible")).athletes.map(
      (athlete) => athlete.id,
    ),
    ["joao"],
  );
  assert.deepEqual(visibleData(state, current("inactive")), {
    accounts: [],
    athletes: [],
  });
  assert.deepEqual(visibleData(state, null), { accounts: [], athletes: [] });
});
test("deactivating a minor changes only the student, never the guardian account", () => {
  const state = fresh();
  const next = toggleProfileActive(state, "superadmin", { athleteId: "joao" });
  assert.equal(
    next.athletes.find((athlete) => athlete.id === "joao").active,
    false,
  );
  assert.deepEqual(next.accounts, state.accounts);
});
test("responsible with linked students cannot switch roles and orphan them", () => {
  const state = fresh();
  const guardian = state.accounts.find(
    (account) => account.id === "responsible",
  );
  assert.throws(
    () =>
      save(state, { ...guardian, role: "admin" }, { accountId: guardian.id }),
    /Reatribua/,
  );
});


test("ordinary admin manages responsible, adult athlete and minor profiles", () => {
  for (const value of [input({ role: "responsible" }), input(), minor()]) {
    const created = saveProfile(fresh(), "admin", value, groups);
    const target = created.result.hasAccess
      ? { accountId: created.state.accounts.at(-1).id }
      : { athleteId: created.state.athletes.at(-1).id };
    const updated = saveProfile(created.state, "admin", { ...value, name: "Nome atualizado" }, groups, target);
    assert.equal(updated.result.name, "Nome atualizado");
    const inactive = toggleProfileActive(updated.state, "admin", target);
    const row = profileRows(inactive).find(row => target.accountId ? row.accountId === target.accountId : row.target.athleteId === target.athleteId);
    assert.equal(row.active, false);
    const active = toggleProfileActive(inactive, "admin", target);
    assert.equal(profileRows(active).find(item => item.key === row.key).active, true);
  }
});

test("ordinary admin cannot create, promote, edit, demote or deactivate administrators", () => {
  const state = fresh();
  assert.throws(() => saveProfile(state, "admin", input({role: "admin"}), groups), /administradores/);
  assert.throws(() => saveProfile(state, "admin", input({role: "admin"}), groups, {accountId: "athlete"}), /administradores/);
  for (const accountId of ["admin", "superadmin"]) {
    for (const role of ["admin", "responsible"]) {
      assert.throws(() => saveProfile(state, "admin", input({role}), groups, {accountId}), /administradores/);
    }
    assert.throws(() => toggleProfileActive(state, "admin", {accountId}), /administradores/);
  }
  state.accounts.find(account => account.id === "admin").active = false;
  assert.throws(() => saveProfile(state, "admin", input(), groups), /administradores/);
});
