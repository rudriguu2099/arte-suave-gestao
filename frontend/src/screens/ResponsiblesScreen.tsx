import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  HeaderBand,
  Heading,
  Page,
  Section,
  colors,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { canManageProfile, isStaff } from "../features/access/domain";
import type { Account, RootStackParamList } from "../features/access/types";

export default function ResponsiblesScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Responsibles">) {
  const { accounts, athletes, current, toggleActive } = useAccess();
  const [pending, setPending] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isStaff(current)) return null;

  const responsibles = accounts.filter((account) => account.role === "responsible");

  async function confirmStatus() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await toggleActive({ accountId: pending.id });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Responsibles" />}>
      <Dialog
        visible={!!pending}
        title={pending?.active ? "Inativar responsável?" : "Ativar responsável?"}
        message={
          pending
            ? `${pending.name}: o acesso ao sistema será alterado.`
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
        <Heading title="RESPONSÁVEIS" />
        <Button
          title="+ NOVO RESPONSÁVEL"
          onPress={() => navigation.navigate("AccountForm", { defaultRole: "responsible" })}
        />
      </HeaderBand>

      <ErrorMessage message={error} />

      <View style={{ gap: 12 }}>
        {responsibles.map((responsible) => {
          const linkedAthletes = athletes.filter(
            (athlete) => athlete.guardianId === responsible.id,
          );
          const contactLine = [responsible.emails[0], responsible.phones[0]]
            .filter(Boolean)
            .join(" · ");
          return (
            <Section key={responsible.id} style={{ gap: 10 }}>
              <View style={{ gap: 6, opacity: responsible.active ? 1 : 0.55 }}>
                <View style={[styles.wrap, { gap: 8 }]}>
                  <Text
                    style={[
                      styles.text,
                      { fontWeight: "800", fontSize: 16, color: colors.ink },
                    ]}
                  >
                    {responsible.name}
                  </Text>
                  {!responsible.active && <Badge label="INATIVO" tone="gray" />}
                </View>

                {!!contactLine && <Text style={styles.muted}>{contactLine}</Text>}

                <Text style={styles.muted}>
                  {linkedAthletes.length
                    ? `Atletas: ${linkedAthletes.map((a) => a.name).join(", ")}`
                    : "Nenhum atleta vinculado"}
                </Text>
              </View>

              {canManageProfile(current, "responsible") && (
                <View style={[styles.wrap, { gap: 8 }]}>
                  <Button
                    title="EDITAR"
                    disabled={!responsible.active}
                    compact
                    secondary
                    onPress={() =>
                      navigation.navigate("AccountForm", { accountId: responsible.id })
                    }
                  />
                  <Button
                    title={responsible.active ? "INATIVAR" : "ATIVAR"}
                    compact
                    secondary={responsible.active}
                    onPress={() => setPending(responsible)}
                  />
                </View>
              )}
            </Section>
          );
        })}
      </View>

      {!responsibles.length && (
        <View style={[styles.card, { alignItems: "center", paddingVertical: 22 }]}>
          <Text style={styles.muted}>Nenhum responsável cadastrado.</Text>
        </View>
      )}
    </Page>
  );
}
