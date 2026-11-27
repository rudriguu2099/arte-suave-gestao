import AsyncStorage from "@react-native-async-storage/async-storage";

// Guarda no aparelho que a conta já viu uma notificação (ex.: o lembrete do mês).
const key = (accountId: string, notificationId: string) =>
  `notification-seen:${accountId}:${notificationId}`;

export async function wasSeen(accountId: string, notificationId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(accountId, notificationId))) === "1";
  } catch {
    return false;
  }
}

export async function markSeen(accountId: string, notificationId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(accountId, notificationId), "1");
  } catch {
    /* Sem armazenamento: o contador só volta a aparecer */
  }
}