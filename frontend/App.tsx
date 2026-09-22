import { StatusBar } from 'expo-status-bar';
import Routes from './src/routes';
import { ThemeProvider } from './src/contexts/ThemeContexts';

export default function App() {
  return (
    <ThemeProvider>
    <Routes />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}