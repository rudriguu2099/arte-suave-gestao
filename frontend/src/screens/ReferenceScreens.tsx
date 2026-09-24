import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter, EventCards } from "../components/access";
import {
  Field,
  Heading,
  Page,
  Section,
  Select,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { ageOn, isStaff, isSuperAdmin } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";

export function GroupsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Groups">) {
  const { groups, athletes, current } = useAccess();
  if (!isStaff(current)) return null;
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Groups" />}>
      <Heading title="TURMAS" subtitle="Turmas disponíveis para vínculo." />
      {groups.map((group) => (
        <Section key={group.id}>
          <Text style={[styles.text, { fontWeight: "700" }]}>{group.name}</Text>
          <Text style={styles.muted}>{group.schedule}</Text>
          <Text style={styles.muted}>
            {
              athletes.filter(
                (athlete) => athlete.groupId === group.id && athlete.active,
              ).length
            }{" "}
            atletas ativos
          </Text>
        </Section>
      ))}
    </Page>
  );
}
export function FinanceScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Finance">) {
  const { current } = useAccess();
  if (!isSuperAdmin(current)) return null;
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Finance" />}>
      <Heading title="GESTÃO FINANCEIRA" />
      <Section>
        <Text style={styles.text}>Módulo em desenvolvimento.</Text>
        <Text style={styles.muted}>
          As funcionalidades financeiras estarão disponíveis em uma próxima
          etapa.
        </Text>
      </Section>
    </Page>
  );
}

export function EventsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Events">) {
  const { current } = useAccess();
  if (!isSuperAdmin(current)) return null;
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Events" />}>
      <Heading title="PRÓXIMOS EVENTOS" subtitle="Agenda do projeto." />
      <EventCards />
    </Page>
  );
}

export function StudentsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Students">) {
  const { athletes, groups, current } = useAccess();
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("all");
  if (!isStaff(current)) return null;
  const filtered = athletes.filter(
    (athlete) =>
      (groupId === "all" || athlete.groupId === groupId) &&
      athlete.name
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Students" />}>
      <Heading title="ALUNOS" subtitle="Alunos cadastrados no projeto." />
      <Field
        label="Buscar aluno"
        placeholder="Nome do aluno"
        value={query}
        onChangeText={setQuery}
      />
      <Select
        label="Turma"
        value={groupId}
        onChange={setGroupId}
        options={[
          { value: "all", label: "Todas as turmas" },
          ...groups.map((group) => ({ value: group.id, label: group.name })),
        ]}
      />
      {filtered.map((athlete) => (
        <Section key={athlete.id}>
          <Text style={[styles.text, { fontWeight: "700" }]}>
            {athlete.name}
          </Text>
          <Text style={styles.muted}>
            {ageOn(athlete.birthDate)} anos · Faixa {athlete.belt.toLowerCase()}
          </Text>
          <Text style={styles.muted}>
            {groups.find((group) => group.id === athlete.groupId)?.name ??
              "Sem turma"}
          </Text>
          <Text style={styles.label}>
            {athlete.active ? "Aluno ativo" : "Aluno inativo"}
          </Text>
        </Section>
      ))}
      {!filtered.length && (
        <Text style={styles.muted}>Nenhum aluno encontrado.</Text>
      )}
    </Page>
  );
}

export function AttendanceScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Attendance">) {
  const { athletes, groups, current } = useAccess();
  const [groupId, setGroupId] = useState("all");
  if (!isStaff(current)) return null;
  const filtered = athletes.filter(
    (athlete) =>
      athlete.active && (groupId === "all" || athlete.groupId === groupId),
  );
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Attendance" />}>
      <Heading
        title="FREQUÊNCIA"
        subtitle="Consulta dos treinos registrados"
      />
      <Select
        label="Turma"
        value={groupId}
        onChange={setGroupId}
        options={[
          { value: "all", label: "Todas as turmas" },
          ...groups.map((group) => ({ value: group.id, label: group.name })),
        ]}
      />
      {filtered.map((athlete) => (
        <Section key={athlete.id}>
          <Text style={[styles.text, { fontWeight: "700" }]}>
            {athlete.name}
          </Text>
          {athlete.attendance.length ? (
            <>
              <View style={styles.wrap}>
                {athlete.attendance.map((present, index) => (
                  <View
                    key={index}
                    accessibilityLabel={`Treino ${index + 1}: ${present ? "presente" : "ausente"}`}
                    style={{
                      backgroundColor: present ? "#202020" : "#F3F3F3",
                      width: 28,
                      height: 28,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: present ? "white" : "#555555",
                        fontSize: 11,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.muted}>
                {athlete.attendance.filter(Boolean).length}/
                {athlete.attendance.length} treinos realizados
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>Nenhuma frequência registrada.</Text>
          )}
        </Section>
      ))}
      {!filtered.length && (
        <Text style={styles.muted}>Nenhum aluno ativo nesta turma.</Text>
      )}
    </Page>
  );
}
