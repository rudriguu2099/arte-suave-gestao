import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

type Cores = {
  fundo: string;
  texto: string;
  subtexto: string;
  inputFundo: string;
  inputBorda: string;
  botaoFundo: string;
  botaoTexto: string;
};

const paletas: Record<'light' | 'dark', Cores> = {
  light: {
    fundo: '#fff', texto: '#111', subtexto: '#666',
    inputFundo: '#f2f2f2', inputBorda: '#ddd',
    botaoFundo: '#111', botaoTexto: '#fff',
  },
  dark: {
    fundo: '#141414', texto: '#fff', subtexto: '#999',
    inputFundo: '#1f1f1f', inputBorda: '#333',
    botaoFundo: '#fff', botaoTexto: '#111',
  },
};

type ThemeContextType = {
  scheme: 'light' | 'dark';
  cores: Cores;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sistemaScheme = useColorScheme();
  const scheme = sistemaScheme === 'dark' ? 'dark' : 'light';
  const cores = paletas[scheme];

  return (
    <ThemeContext.Provider value={{ scheme, cores }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de um ThemeProvider');
  }
  return context;
}