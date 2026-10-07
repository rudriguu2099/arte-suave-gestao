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
import { canChangePassword, requireManageProfile, validateNewPassword, validateContacts, ageOn } from "./domain";
import { findProfile } from "./profiles";
import { validarTurma } from "../../utils/validators";
import type {
  Account,
  Event,
  Group,
  GroupInput,
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
  getToken: () => string;
  login: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  saveProfile: (
    input: ProfileInput,
    target?: ProfileTarget,
  ) => Promise<ProfileResult>;
  toggleActive: (target: ProfileTarget) => Promise<void>;
  saveGroup: (input: GroupInput, id?: string) => Promise<void>;
  toggleGroupActive: (id: string) => Promise<void>;
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
    const { account } = findProfile(data, target);
    requireManageProfile(data.current, account?.role);
    requireManageProfile(data.current, input.role);
    validateContacts(input.emails, input.phones, !(input.role === "athlete" && ageOn(input.birthDate) >= 0 && ageOn(input.birthDate) < 18));
    const result = await accessApi.saveProfile(requireToken(), input, target);
    await refresh(); // A refresh failure never retries an already committed write.
    return result;
  }
  async function toggleActive(target: ProfileTarget) {
    const { account } = findProfile(data, target);
    requireManageProfile(data.current, account?.role);
    if (account?.isSuperAdmin) throw new Error("O acesso do superadmin é gerenciado no banco de dados.");
    await accessApi.toggleActive(requireToken(), target);
    await refresh();
  }
  async function saveGroup(input: GroupInput, id?: string) {
    const erro = validarTurma(input);
    if (erro) throw new Error(erro);
    await accessApi.saveGroup(requireToken(), input, id);
    await refresh();
  }
  async function toggleGroupActive(id: string) {
    await accessApi.toggleGroupActive(requireToken(), id);
    await refresh();
  }
  async function changePassword(
    id: string,
    password: string,
    confirmation: string,
    currentPassword = "",
  ) {
    if (!canChangePassword(data.current, id, data.accounts.find((account) => account.id === id)?.role))
      throw new Error("Você não tem permissão para alterar esta senha.");
    validateNewPassword(password, confirmation, id === data.current?.id ? currentPassword : undefined);
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
        getToken: requireToken,
        refresh,
        saveProfile,
        toggleActive,
        saveGroup,
        toggleGroupActive,
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
