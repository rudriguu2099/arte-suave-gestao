import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { accessApi, type AccessState } from "../../services/accessApi";
import { ApiError } from "../../services/api";
import { canChangePassword, validateNewPassword } from "./domain";
import type {
  Account,
  Event,
  Group,
  ProfileInput,
  ProfileResult,
  ProfileState,
  ProfileTarget,
} from "./types";

type AccessValue = ProfileState & {
  current: Account | null;
  groups: Group[];
  events: Event[];
  syncError: string;
  refreshing: boolean;
  sessionMessage: string;
  login: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  saveProfile: (
    input: ProfileInput,
    target?: ProfileTarget,
  ) => Promise<ProfileResult>;
  toggleActive: (target: ProfileTarget) => Promise<void>;
  changePassword: (
    id: string,
    password: string,
    confirmation: string,
    currentPassword?: string,
  ) => Promise<void>;
};
const Context = createContext<AccessValue | null>(null);
const empty = {
  accounts: [],
  athletes: [],
  groups: [],
  events: [],
  current: null,
};

export function AccessProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<
    Omit<AccessState, "current"> & { current: Account | null }
  >(empty);
  const [syncError, setSyncError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Session token stays in memory, never in localStorage/AsyncStorage.
  const token = useRef<string | null>(null);
  const epoch = useRef(0);
  const signOut = useCallback(() => {
    epoch.current++;
    token.current = null;
    setData(empty);
    setSyncError("");
    setSessionMessage("");
    setRefreshing(false);
  }, []);
  const refresh = useCallback(async () => {
    const activeToken = token.current;
    if (!activeToken) return;
    const generation = epoch.current;
    setRefreshing(true);
    try {
      const next = await accessApi.state(activeToken);
      if (generation === epoch.current) {
        setData(next);
        setSyncError("");
      }
    } catch (error) {
      if (generation !== epoch.current) return;
      if (error instanceof ApiError && error.status === 401) signOut();
      else setSyncError((error as Error).message);
    } finally {
      if (generation === epoch.current) setRefreshing(false);
    }
  }, [signOut]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
  async function login(email: string, password: string) {
    const generation = ++epoch.current;
    const credentials = await accessApi.login(email, password);
    const next = await accessApi.state(credentials.accessToken);
    if (generation === epoch.current) {
      token.current = credentials.accessToken;
      setData(next);
      setSyncError("");
      setSessionMessage("");
    }
  }
  function requireToken() {
    if (!token.current) throw new Error("Entre novamente para continuar.");
    return token.current;
  }
  async function saveProfile(input: ProfileInput, target?: ProfileTarget) {
    const result = await accessApi.saveProfile(requireToken(), input, target);
    await refresh(); // A refresh failure never retries an already committed write.
    return result;
  }
  async function toggleActive(target: ProfileTarget) {
    await accessApi.toggleActive(requireToken(), target);
    await refresh();
  }
  async function changePassword(
    id: string,
    password: string,
    confirmation: string,
    currentPassword = "",
  ) {
    if (!canChangePassword(data.current, id))
      throw new Error("Você não tem permissão para alterar esta senha.");
    validateNewPassword(password, confirmation);
    if (password.length < 6)
      throw new Error("A nova senha precisa ter pelo menos seis caracteres.");
    if (id === data.current?.id) {
      if (!currentPassword) throw new Error("Informe a senha atual.");
      await accessApi.changePassword(requireToken(), currentPassword, password);
      signOut();
      setSessionMessage(
        "Senha alterada com sucesso. Entre novamente com a nova senha.",
      );
    } else {
      await accessApi.resetPassword(requireToken(), id, password);
    }
  }
  return (
    <Context.Provider
      value={{
        ...data,
        syncError,
        refreshing,
        sessionMessage,
        login,
        signOut,
        refresh,
        saveProfile,
        toggleActive,
        changePassword,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAccess() {
  const context = useContext(Context);
  if (!context) throw new Error("AccessProvider não encontrado.");
  return context;
}
