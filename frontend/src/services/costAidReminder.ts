import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { costAidReminders } from "../features/access/domain";
import type { Account } from "../features/access/types";

export async function syncCostAidReminder(account: Account | null) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const reminders = costAidReminders(account);
  if (!reminders.length) return;
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;
  for (const { day, hour, title, body } of reminders)
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day, hour, minute: 0 },
    });
}
