import { test } from "node:test";
import assert from "node:assert/strict";
import { costAidReminders } from "../src/features/access/domain.ts";

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
