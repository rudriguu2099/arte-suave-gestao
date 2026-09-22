import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Button,
  ErrorMessage,
  Field,
  Heading,
  Page,
  Section,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isSuperAdmin } from "../features/access/domain";
import { profileRows } from "../features/access/profiles";
import { roleLabels, type RootStackParamList } from "../features/access/types";

export default function AccountsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Accounts">) {
  const { accounts, athletes, current, toggleActive } = useAccess();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  if (!isSuperAdmin(current)) return null;
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
  function changeStatus(row: (typeof rows)[number]) {
    Alert.alert(
      (row.active ? "Inativar" : "Ativar") +
        (row.hasAccess ? " conta?" : " aluno?"),
      row.hasAccess
        ? row.name +
            (row.active
              ? " ficará sem acesso ao sistema."
              : " poderá acessar o sistema novamente.")
        : "Alterar a situação do aluno " +
            row.name +
            ". A conta do responsável não será alterada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: row.active ? "Inativar" : "Ativar",
          onPress: () => {
            try {
              toggleActive(row.target);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          },
        },
      ],
    );
  }
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Accounts" />}>
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
                <Button
                  title="EDITAR"
                  compact
                  secondary
                  onPress={() => navigation.navigate("AccountForm", row.target)}
                />
                {!row.isSuperAdmin && (
                  <Button
                    title={row.active ? "INATIVAR" : "ATIVAR"}
                    compact
                    secondary
                    onPress={() => changeStatus(row)}
                  />
                )}
                {row.hasAccess && row.accountId && (
                  <Button
                    title="REDEFINIR SENHA"
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
