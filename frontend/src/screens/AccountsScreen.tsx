import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Button,
  Dialog,
  ErrorMessage,
  Field,
  Heading,
  Page,
  Section,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, canManageProfile, canChangePassword } from "../features/access/domain";
import { profileRows } from "../features/access/profiles";
import { roleLabels, type RootStackParamList } from "../features/access/types";

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
        confirmLabel={pending?.active ? "INATIVAR" : "ATIVAR"}
      />
      <Heading
        title="GERENCIAMENTO DE CONTAS"
        subtitle="Todos os perfis e alunos em um único cadastro."
      />
      <Button
        title="+ NOVO PERFIL"
        onPress={() => navigation.navigate("AccountForm")}
      />
      <Field
        label="Buscar perfil"
        placeholder="Nome, e-mail ou função"
        value={query}
        onChangeText={setQuery}
      />
      <ErrorMessage message={error} />
      <View style={{ gap: 10 }}>
        {filtered.map((row) => (
          <View key={row.key} style={{ opacity: row.active ? 1 : 0.62 }}>
            <Section>
              <View style={[styles.row, { flexWrap: "wrap", gap: 6 }]}>
                <Text
                  style={[
                    styles.text,
                    { fontWeight: "700", fontSize: 16, flexShrink: 1 },
                  ]}
                >
                  {row.name}
                </Text>
                <View
                  style={{
                    backgroundColor: "#202020",
                    paddingHorizontal: 5,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 8 }}>
                    {row.isSuperAdmin
                      ? "SUPERADMIN"
                      : roleLabels[row.role].toUpperCase()}
                  </Text>
                </View>
              </View>
              {!!row.emails[0] && (
                <Text style={styles.muted}>{row.emails[0]}</Text>
              )}
              {!row.hasAccess && (
                <Text style={styles.muted}>
                  Aluno sem conta própria · Responsável:{" "}
                  {row.guardianName ?? "Não vinculado"}
                </Text>
              )}
              {!row.active && (
                <Text style={styles.label}>
                  {row.hasAccess ? "Conta inativa" : "Aluno inativo"}
                </Text>
              )}
              <View style={styles.wrap}>
                {canManageProfile(current, row.role) && (
                  <Button
                    title="EDITAR"
                    compact
                    secondary
                    onPress={() => navigation.navigate("AccountForm", row.target)}
                  />
                )}
                {canManageProfile(current, row.role) && !row.isSuperAdmin && (
                  <Button
                    title={row.active ? "INATIVAR" : "ATIVAR"}
                    compact
                    secondary
                    onPress={() => setPending(row)}
                  />
                )}
                {row.hasAccess && row.accountId && canChangePassword(current, row.accountId, row.role) && (
                  <Button
                    title={row.accountId === current?.id ? "ALTERAR MINHA SENHA" : "REDEFINIR SENHA"}
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
          </View>
        ))}
      </View>
      {!filtered.length && (
        <Text style={styles.muted}>Nenhum perfil encontrado.</Text>
      )}
    </Page>
  );
}
