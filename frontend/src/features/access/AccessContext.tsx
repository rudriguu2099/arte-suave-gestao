import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { canChangePassword, validateNewPassword } from "./domain";
import { events, groups, seedAccounts, seedAthletes } from "./fixtures";
import {
  saveProfile as saveProfileTransaction,
  toggleProfileActive,
  visibleData,
} from "./profiles";
import type {
  Account,
  ProfileInput,
  ProfileResult,
  ProfileState,
  ProfileTarget,
} from "./types";

type AccessValue = ProfileState & {
  current: Account | null;
  demoMode: boolean;
  demoProfiles: Pick<Account, "id" | "name" | "role" | "isSuperAdmin">[];
  groups: typeof groups;
  events: typeof events;
  selectDemoAccount: (id: string) => void;
  signOut: () => void;
  saveProfile: (input: ProfileInput, target?: ProfileTarget) => ProfileResult;
  toggleActive: (target: ProfileTarget) => void;
  changePassword: (id: string, password: string, confirmation: string) => void;
};
const Context = createContext<AccessValue | null>(null);

/** Local demo only. Production session flags and permissions must come from the API. */
export function AccessProvider({
  children,
  demoMode = false,
}: {
  children: ReactNode;
  demoMode?: boolean;
}) {
  const [data, setData] = useState<ProfileState>(() => ({
    accounts: demoMode ? seedAccounts : [],
    athletes: demoMode ? seedAthletes : [],
  }));
  const [currentId, setCurrentId] = useState<string | null>(null);
  const latest = useRef(data);
  const current =
    data.accounts.find(
      (account) => account.id === currentId && account.active,
    ) ?? null;
  const commit = (next: ProfileState) => {
    latest.current = next;
    setData(next);
  };
  function saveProfile(input: ProfileInput, target?: ProfileTarget) {
    const transaction = saveProfileTransaction(
      latest.current,
      currentId,
      input,
      groups,
      target,
    );
    commit(transaction.state);
    return transaction.result;
  }
  function toggleActive(target: ProfileTarget) {
    commit(toggleProfileActive(latest.current, currentId, target));
  }
  function changePassword(id: string, password: string, confirmation: string) {
    const actor =
      latest.current.accounts.find((account) => account.id === currentId) ??
      null;
    if (!canChangePassword(actor, id))
      throw new Error("Você não tem permissão para alterar esta senha.");
    if (!latest.current.accounts.some((account) => account.id === id))
      throw new Error("Conta não encontrada.");
    validateNewPassword(password, confirmation);
    // Credentials are not persisted or used for authentication in this demo.
  }
  const visible = visibleData(data, current);
  return (
    <Context.Provider
      value={{
        ...visible,
        current,
        demoMode,
        groups,
        events,
        demoProfiles:
          demoMode && !current
            ? data.accounts
                .filter((account) => account.active)
                .map(({ id, name, role, isSuperAdmin }) => ({
                  id,
                  name,
                  role,
                  isSuperAdmin,
                }))
            : [],
        selectDemoAccount: (id) => {
          if (
            demoMode &&
            latest.current.accounts.some(
              (account) => account.id === id && account.active,
            )
          )
            setCurrentId(id);
        },
        signOut: () => setCurrentId(null),
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
