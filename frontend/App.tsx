import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/contexts/ThemeContexts";
import { AccessProvider } from "./src/features/access/AccessContext";
import Routes from "./src/routes";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AccessProvider>
          <Routes />
          <StatusBar style="auto" />
        </AccessProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
