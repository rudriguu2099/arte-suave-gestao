import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Badge,
  type BadgeTone,
  Button,
  Dialog,
  ErrorMessage,
  Field,
  HeaderBand,
  Heading,
  Page,
  Section,
  colors,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, canManageProfile, canChangePassword } from "../features/access/domain";
import { profileRows } from "../features/access/profiles";
import { roleLabels, type Role, type RootStackParamList } from "../features/access/types";

function roleBadgeTone(role: Role, isSuperAdmin: boolean): BadgeTone {
  if (isSuperAdmin || role === "admin") return "purple";
  if (role === "responsible") return "lavender";
  return "blue";
}

export default function AccountsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Accounts">) {
  const { accounts, athletes, current, toggleActive } = useAccess();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<
    ReturnType<typeof profileRows>[number] | null
  >(null);
  const [busy, setBusy] = useState(false);

  if (!isStaff(current)) return null;

  const rows = profileRows({ accounts, athletes });
  const filtered = rows.filter((row) =>
    (
      row.name +
      " " +
      row.emails.join(" ") +
      " " +
      roleLabels[row.role] +
      (row.isSuperAdmin ? " superadmin" : "")
    )
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  async function confirmStatus() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await toggleActive(pending.target);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Accounts" />}>
      <Dialog
        visible={!!pending}
        title={pending?.active ? "Inativar perfil?" : "Ativar perfil?"}
        message={
          pending
            ? `${pending.name}: ${pending.hasAccess ? "o acesso ao sistema será alterado." : "a situação do aluno será alterada. A conta do responsável será mantida."}`
            : ""
        }
        onClose={() => setPending(null)}
        onConfirm={confirmStatus}
        busy={busy}
        danger={pending?.active}
        confirmLabel={pending?.active ? "INATIVAR" : "ATIVAR"}
      />

      <HeaderBand>
        {navigation.canGoBack() && <Back onPress={navigation.goBack} />}
        <Heading title="CONTAS DE ACESSO" />
        <Button
          title="+ NOVA CONTA"
          onPress={() => navigation.navigate("AccountForm")}
        />
        <Field
          label=""
          surface
          placeholder="Buscar por nome, e-mail ou função..."
          value={query}
          onChangeText={setQuery}
        />
      </HeaderBand>

      <ErrorMessage message={error} />

      <View style={{ gap: 12 }}>
        {filtered.map((row) => (
          <Section key={row.key} style={{ gap: 10 }}>
            <View style={{ gap: 8, opacity: row.active ? 1 : 0.55 }}>
              <View style={[styles.row, { alignItems: "flex-start", justifyContent: "space-between" }]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={[styles.wrap, { gap: 8 }]}>
                    <Text
                      style={[
                        styles.text,
                        { fontWeight: "800", fontSize: 16, color: colors.ink, flexShrink: 1 },
                      ]}
                    >
                      {row.name}
                    </Text>
                    <Badge
                      label={
                        row.isSuperAdmin
                          ? "SUPERADMIN"
                          : row.role === "admin"
                            ? "ADMIN"
                            : roleLabels[row.role]
                      }
                      tone={roleBadgeTone(row.role, row.isSuperAdmin)}
                    />
                    {!row.active && (
                      <Badge
                        label={row.hasAccess ? "CONTA INATIVA" : "INATIVO"}
                        tone="gray"
                      />
                    )}
                  </View>

                  {!!row.emails[0] && (
                    <Text style={styles.muted}>{row.emails[0]}</Text>
                  )}

                  {!row.hasAccess && (
                    <Text style={styles.muted}>
                      Aluno sem conta própria · Resp.: {row.guardianName ?? "Não vinculado"}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.wrap, { gap: 8 }]}>
              {canManageProfile(current, row.role) && (
                <Button
                  title="EDITAR"
                  disabled={!row.active}
                  compact
                  secondary
                  onPress={() => navigation.navigate("AccountForm", row.target)}
                />
              )}
              {canManageProfile(current, row.role) && !row.isSuperAdmin && (
                <Button
                  title={row.active ? "INATIVAR" : "ATIVAR"}
                  compact
                  secondary={row.active}
                  onPress={() => setPending(row)}
                />
              )}
              {row.hasAccess &&
                row.accountId &&
                canChangePassword(current, row.accountId, row.role) && (
                  <Button
                    title={
                      row.accountId === current?.id
                        ? "ALTERAR MINHA SENHA"
                        : "REDEFINIR SENHA"
                    }
                    disabled={!row.active}
                    compact
                    secondary
                    onPress={() =>
                      navigation.navigate("Password", {
                        accountId: row.accountId,
                      })
                    }
                  />
                )}
            </View>
          </Section>
        ))}
      </View>

      {!filtered.length && (
        <View style={[styles.card, { alignItems: "center", paddingVertical: 22 }]}>
          <Text style={styles.muted}>Nenhum perfil encontrado.</Text>
        </View>
      )}
    </Page>
  );
}
