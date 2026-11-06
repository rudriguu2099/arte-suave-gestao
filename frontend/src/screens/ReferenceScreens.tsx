import { useState } from "react";
import { Text } from "react-native";
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
