import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccessProvider } from "./src/features/access/AccessContext";
import Routes from "./src/routes";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <SafeAreaProvider>
        <AccessProvider>
          <Routes />
          <StatusBar style="auto" />
        </AccessProvider>
    </SafeAreaProvider>
  );
}
