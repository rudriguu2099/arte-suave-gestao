import { api } from "./api";
import type {
  Account,
  Event,
  Group,
  ProfileInput,
  ProfileResult,
  ProfileState,
  ProfileTarget,
} from "../features/access/types";

export type AccessState = ProfileState & {
  current: Account;
  groups: Group[];
  events: Event[];
};
const targetPath = (target: ProfileTarget) =>
  target.accountId
    ? "account/" + encodeURIComponent(target.accountId)
    : "athlete/" + encodeURIComponent(target.athleteId!);

export const accessApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string }>("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    }),
  state: (token: string) => api.get<AccessState>("/access/state", token),
  saveProfile: (token: string, input: ProfileInput, target?: ProfileTarget) => {
    const body = {
      ...input,
      name: input.name.trim(),
      emails: input.emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
      phones: input.phones.map((phone) => phone.trim()).filter(Boolean),
    };
    return target
      ? api.patch<ProfileResult>(
          "/access/profiles/" + targetPath(target),
          body,
          token,
        )
      : api.post<ProfileResult>("/access/profiles", body, token);
  },
  toggleActive: (token: string, target: ProfileTarget) =>
    api.post<void>(
      "/access/profiles/" + targetPath(target) + "/toggle-active",
      {},
      token,
    ),
  changePassword: (
    token: string,
    currentPassword: string,
    newPassword: string,
  ) =>
    api.post<void>(
      "/auth/change-password",
      { currentPassword, newPassword },
      token,
    ),
  resetPassword: (token: string, id: string, newPassword: string) =>
    api.patch<void>(
      "/admin/users/" + encodeURIComponent(id) + "/reset-password",
      { newPassword },
      token,
    ),
};
