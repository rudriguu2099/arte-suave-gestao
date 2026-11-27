import { test } from "node:test";
import assert from "node:assert/strict";
import { costAidReminderCard, costAidReminders } from "../src/features/access/domain.ts";

const account = (role, active = true) => ({ role, active });

test("lembretes da ajuda de custo: dias 5 a 10, 9h e 19h, só para responsável e atleta ativos", () => {
  for (const role of ["responsible", "athlete"]) {
    const reminders = costAidReminders(account(role));
    assert.equal(reminders.length, 12);
    assert.deepEqual([...new Set(reminders.map((r) => r.day))], [5, 6, 7, 8, 9, 10]);
    assert.deepEqual([...new Set(reminders.map((r) => r.hour))], [9, 19]);
  }
  assert.deepEqual(costAidReminders(account("admin")), []);
  assert.deepEqual(costAidReminders(account("responsible", false)), []);
  assert.deepEqual(costAidReminders(null), []);
});

test("card do lembrete aparece só do dia 5 ao 10 para responsável e atleta", () => {
  const dia = (d) => new Date(2026, 11, d); // dezembro de 2026
  assert.equal(costAidReminderCard(account("responsible"), dia(5)).title, "Lembrete: Ajuda de custo — Dezembro");
  assert.ok(costAidReminderCard(account("athlete"), dia(10)));
  assert.equal(costAidReminderCard(account("responsible"), dia(4)), null);
  assert.equal(costAidReminderCard(account("responsible"), dia(11)), null);
  assert.equal(costAidReminderCard(account("admin"), dia(7)), null);
  assert.equal(costAidReminderCard(account("responsible", false), dia(7)), null);
});
