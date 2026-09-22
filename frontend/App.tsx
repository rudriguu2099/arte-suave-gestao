import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccessProvider } from "./src/features/access/AccessContext";

import Routes from "./src/routes";

export default function App() {
  return (
    <SafeAreaProvider>
      <AccessProvider demoMode={__DEV__}>
        <Routes />
        <StatusBar style="dark" />
      </AccessProvider>
    </SafeAreaProvider>
  );
}
