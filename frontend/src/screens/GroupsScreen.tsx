import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Back,
  Button,
  colors,
  Dialog,
  ErrorMessage,
  Field,
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
    <View style={{ backgroundColor: colors.ink, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: colors.paper, fontSize: 10, fontWeight: "700" }}>
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
        confirmLabel={pending?.active ? "INATIVAR" : "ATIVAR"}
      />
      <Heading title="TURMAS" subtitle="Crie, edite e inative turmas" />
      <Button title="+ NOVA TURMA" onPress={() => navigation.navigate("GroupForm")} />
      <ErrorMessage message={error} />
      <View style={{ gap: 10 }}>
        {groups.map((group) => (
          <Section key={group.id}>
            <View style={[styles.row, { alignItems: "flex-start" }]}>
              <View style={{ flex: 1, gap: 6, opacity: group.active ? 1 : 0.45 }}>
                <Text style={[styles.text, { fontWeight: "700", fontSize: 16 }]}>
                  {group.name}
                </Text>
                {!!(group.ageRange || group.level) && (
                  <Text style={[styles.muted, { fontSize: 10 }]}>
                    {[group.ageRange, group.level].filter(Boolean).join(" · ")}
                  </Text>
                )}
                {group.sessions.length ? (
                  <View style={styles.wrap}>
                    {group.sessions.map((session) => (
                      <View key={session.weekday + session.start} style={[styles.row, { gap: 4 }]}>
                        <DayTag weekday={session.weekday} />
                        <Text style={[styles.muted, { fontSize: 11 }]}>
                          {session.start}-{session.end}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.muted}>{group.schedule}</Text>
                )}
                {!group.active && <Text style={styles.label}>Turma inativa</Text>}
              </View>
              <View style={{ gap: 8 }}>
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
      {!groups.length && <Text style={styles.muted}>Nenhuma turma cadastrada.</Text>}
    </Page>
  );
}

export function GroupFormScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "GroupForm">) {
  const { groups, current, saveGroup } = useAccess();
  const groupId = route.params?.groupId;
  const existing = groups.find((group) => group.id === groupId);
  const [name, setName] = useState(existing?.name ?? "");
  const [ageRange, setAgeRange] = useState(existing?.ageRange ?? "");
  const [level, setLevel] = useState(existing?.level ?? "");
  const [sessions, setSessions] = useState<GroupSession[]>(existing?.sessions ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);
  if (!isStaff(current)) return null;
  if (groupId && !existing)
    return (
      <Page>
        <Back onPress={navigation.goBack} />
        <ErrorMessage message="Turma não encontrada." />
      </Page>
    );
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
  const selected = week
    .map((weekday) => sessions.find((session) => session.weekday === weekday))
    .filter((session) => !!session);
  return (
    <Page>
      <Back onPress={navigation.goBack} />
      <Heading
        title={existing ? "EDITAR TURMA" : "NOVA TURMA"}
        subtitle="Nome, critério e horários de treino"
      />
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
      <Section>
        <Text style={styles.label}>Dias e horários *</Text>
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
                  minWidth: 44,
                  minHeight: 44,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: active ? colors.ink : colors.border,
                  backgroundColor: active ? colors.ink : colors.paper,
                }}
              >
                <Text style={[styles.text, { color: active ? colors.paper : colors.ink }]}>
                  {weekdayLabels[weekday]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!selected.length && <Text style={styles.muted}>Selecione pelo menos um dia de treino</Text>}
        {selected.map((session) => (
          <View key={session.weekday} style={styles.row}>
            <DayTag weekday={session.weekday} />
            {(["start", "end"] as const).map((field, index) => (
              <View key={field} style={[styles.row, { flex: 1 }]}>
                {index > 0 && <Text style={styles.muted}>—</Text>}
                <TextInput
                  accessibilityLabel={`${weekdayLabels[session.weekday]}: ${field === "start" ? "início" : "término"}`}
                  placeholder={field === "start" ? "18:00" : "19:30"}
                  placeholderTextColor="#929292"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={session[field]}
                  onChangeText={(value) => setTime(session.weekday, field, value)}
                  style={[styles.input, { flex: 1 }]}
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
            title={saving ? "SALVANDO..." : existing ? "SALVAR ALTERAÇÕES" : "CRIAR TURMA"}
            disabled={saving}
            onPress={save}
          />
        </View>
      </View>
    </Page>
  );
}
