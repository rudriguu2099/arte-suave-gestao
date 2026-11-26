import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Badge,
  Button,
  colors,
  Dialog,
  ErrorMessage,
  Field,
  HeaderBand,
  Heading,
  Page,
  Section,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff } from "../features/access/domain";
import {
  weekdayLabels,
  type Group,
  type GroupSession,
  type RootStackParamList,
} from "../features/access/types";
import { formatarHora } from "../utils/validators";

// Semana exibida a partir de segunda, como no mockup.
const week = [1, 2, 3, 4, 5, 6, 0];

function DayTag({ weekday }: { weekday: number }) {
  return (
    <View
      style={{
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
      }}
    >
      <Text style={{ color: colors.paper, fontSize: 11, fontWeight: "700" }}>
        {weekdayLabels[weekday]}
      </Text>
    </View>
  );
}

export function GroupsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Groups">) {
  const { groups, current, toggleGroupActive } = useAccess();
  const [pending, setPending] = useState<Group | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isStaff(current)) return null;

  async function confirmStatus() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await toggleGroupActive(pending.id);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Groups" />}>
      <Dialog
        visible={!!pending}
        title={pending?.active ? "Inativar turma?" : "Ativar turma?"}
        message={
          pending
            ? pending.active
              ? `${pending.name}: a turma deixa de receber novos alunos. Só é possível inativar uma turma sem alunos ativos.`
              : `${pending.name}: a turma volta a receber novos alunos.`
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
        <Heading title="TURMAS" />
        <Button title="+ NOVA TURMA" onPress={() => navigation.navigate("GroupForm")} />
      </HeaderBand>

      <ErrorMessage message={error} />

      <View style={{ gap: 12 }}>
        {groups.map((group) => (
          <Section key={group.id}>
            <View style={[styles.row, { alignItems: "flex-start" }]}>
              <Pressable
                style={{ flex: 1, gap: 8, opacity: group.active ? 1 : 0.55 }}
                onPress={() => navigation.navigate("Students", { groupId: group.id })}
              >
                <View style={[styles.wrap, { gap: 8 }]}>
                  <Text style={[styles.text, { fontWeight: "800", fontSize: 16, color: colors.ink }]}>
                    {group.name}
                  </Text>
                  {!group.active && <Badge label="INATIVA" tone="gray" />}
                </View>

                {!!(group.ageRange || group.level) && (
                  <Text style={styles.muted}>
                    {[group.ageRange, group.level].filter(Boolean).join(" · ")}
                  </Text>
                )}

                {group.sessions.length ? (
                  <View style={[styles.wrap, { gap: 8 }]}>
                    {group.sessions.map((session) => (
                      <View key={session.weekday + session.start} style={[styles.row, { gap: 6 }]}>
                        <DayTag weekday={session.weekday} />
                        <Text style={[styles.muted, { fontSize: 12, color: colors.text }]}>
                          {session.start}–{session.end}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.muted}>{group.schedule}</Text>
                )}
              </Pressable>

              <View style={{ gap: 6, alignItems: "stretch" }}>
                <Button
                  title="EDITAR"
                  compact
                  secondary
                  disabled={!group.active}
                  onPress={() => navigation.navigate("GroupForm", { groupId: group.id })}
                />
                <Button
                  title={group.active ? "INATIVAR" : "ATIVAR"}
                  compact
                  secondary={group.active}
                  onPress={() => setPending(group)}
                />
              </View>
            </View>
          </Section>
        ))}
      </View>

      {!groups.length && (
        <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
          <Text style={styles.muted}>Nenhuma turma cadastrada.</Text>
        </View>
      )}
    </Page>
  );
}

export function GroupFormScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "GroupForm">) {
  const { groups, current, saveGroup, toggleGroupActive } = useAccess();
  const groupId = route.params?.groupId;
  const existing = groups.find((group) => group.id === groupId);
  const [name, setName] = useState(existing?.name ?? "");
  const [ageRange, setAgeRange] = useState(existing?.ageRange ?? "");
  const [level, setLevel] = useState(existing?.level ?? "");
  const [sessions, setSessions] = useState<GroupSession[]>(existing?.sessions ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [toggling, setToggling] = useState(false);
  const submitted = useRef(false);

  if (!isStaff(current)) return null;
  if (groupId && !existing) {
    return (
      <Page>
        <Back onPress={navigation.goBack} />
        <ErrorMessage message="Turma não encontrada." />
      </Page>
    );
  }

  function toggleDay(weekday: number) {
    setSessions((previous) =>
      previous.some((session) => session.weekday === weekday)
        ? previous.filter((session) => session.weekday !== weekday)
        : [...previous, { weekday, start: "", end: "" }],
    );
  }

  function setTime(weekday: number, field: "start" | "end", value: string) {
    setSessions((previous) =>
      previous.map((session) =>
        session.weekday === weekday ? { ...session, [field]: formatarHora(value) } : session,
      ),
    );
  }

  async function save() {
    if (submitted.current) return;
    submitted.current = true;
    setSaving(true);
    setError("");
    try {
      await saveGroup({ name, ageRange, level, sessions }, groupId);
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      submitted.current = false;
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!existing || toggling) return;
    setToggling(true);
    setError("");
    try {
      await toggleGroupActive(existing.id);
      setConfirmToggle(false);
      navigation.goBack();
    } catch (e) {
      setConfirmToggle(false);
      setError((e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  const selected = week
    .map((weekday) => sessions.find((session) => session.weekday === weekday))
    .filter((session): session is GroupSession => !!session);

  return (
    <Page>
      <Dialog
        visible={confirmToggle}
        title={existing?.active ? "Inativar turma?" : "Ativar turma?"}
        message={
          existing
            ? existing.active
              ? `${existing.name}: a turma deixa de receber novos alunos. Só é possível inativar uma turma sem alunos ativos.`
              : `${existing.name}: a turma volta a receber novos alunos.`
            : ""
        }
        confirmLabel={existing?.active ? "INATIVAR" : "ATIVAR"}
        danger={existing?.active}
        busy={toggling}
        onConfirm={handleToggleActive}
        onClose={() => setConfirmToggle(false)}
      />

      <HeaderBand>
        <Back onPress={navigation.goBack} />
        <Heading title={existing ? "EDITAR TURMA" : "NOVA TURMA"} />
      </HeaderBand>

      <Section>
        <Field
          label="Nome da turma *"
          placeholder="Ex: Infantil Iniciante"
          maxLength={80}
          value={name}
          onChangeText={setName}
        />
        <Field
          label="Faixa etária *"
          placeholder="Ex: 6-10 anos"
          maxLength={80}
          value={ageRange}
          onChangeText={setAgeRange}
        />
        <Field
          label="Nível técnico *"
          placeholder="Ex: Branca/Cinza"
          maxLength={80}
          value={level}
          onChangeText={setLevel}
        />
      </Section>

      <Section title="Dias e horários *">
        <View style={styles.wrap}>
          {week.map((weekday) => {
            const active = sessions.some((session) => session.weekday === weekday);
            return (
              <Pressable
                key={weekday}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggleDay(weekday)}
                style={{
                  minWidth: 48,
                  minHeight: 42,
                  paddingHorizontal: 12,
                  borderRadius: active ? 10 : 999,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.paper,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: active ? "800" : "600",
                    color: active ? colors.paper : colors.muted,
                  }}
                >
                  {weekdayLabels[weekday]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!selected.length && (
          <Text style={styles.muted}>Selecione pelo menos um dia de treino.</Text>
        )}

        {selected.map((session) => (
          <View key={session.weekday} style={styles.row}>
            <View style={{ width: 42, alignItems: "flex-start" }}>
              <DayTag weekday={session.weekday} />
            </View>
            {(["start", "end"] as const).map((field, index) => (
              <View key={field} style={[styles.row, { flex: 1, minWidth: 0, gap: 6 }]}>
                {index > 0 && <Text style={styles.muted}>–</Text>}
                <TextInput
                  accessibilityLabel={`${weekdayLabels[session.weekday]}: ${field === "start" ? "início" : "término"}`}
                  placeholder={field === "start" ? "18:00" : "19:30"}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={5}
                  value={session[field]}
                  onChangeText={(value) => setTime(session.weekday, field, value)}
                  style={[styles.input, { flex: 1, minWidth: 0, textAlign: "center" }]}
                />
              </View>
            ))}
          </View>
        ))}
      </Section>

      <ErrorMessage message={error} />

      <View style={styles.row}>
        <Button title="CANCELAR" secondary disabled={saving} onPress={navigation.goBack} />
        <View style={{ flex: 1 }}>
          <Button
            title={saving ? "SALVANDO..." : existing ? "SALVAR" : "CRIAR TURMA"}
            disabled={saving}
            onPress={save}
          />
        </View>
      </View>

      {existing && (
        <Button
          title={existing.active ? "INATIVAR TURMA" : "ATIVAR TURMA"}
          danger={existing.active}
          secondary={!existing.active}
          disabled={saving || toggling}
          onPress={() => setConfirmToggle(true)}
        />
      )}
    </Page>
  );
}
