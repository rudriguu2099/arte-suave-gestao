import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter } from "../components/access";
import {
  Badge,
  Field,
  HeaderBand,
  Heading,
  Page,
  Section,
  Select,
  colors,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { ageOn, isStaff } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";

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
      athlete.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Students" />}>
      <HeaderBand>
        <Heading title="ALUNOS" subtitle="Alunos cadastrados no projeto." />
        <Field
          label=""
          surface
          placeholder="Buscar por nome..."
          value={query}
          onChangeText={setQuery}
        />
        <Select
          label=""
          surface
          value={groupId}
          onChange={setGroupId}
          options={[
            { value: "all", label: "Todas as turmas" },
            ...groups.map((group) => ({ value: group.id, label: group.name })),
          ]}
        />
      </HeaderBand>
      <View style={{ gap: 12 }}>
        {filtered.map((athlete) => (
          <Section key={athlete.id}>
            <View style={[styles.wrap, { justifyContent: "space-between" }]}>
              <Text style={[styles.text, { fontWeight: "700", fontSize: 16, color: colors.ink }]}>
                {athlete.name}
              </Text>
              <Badge
                label={athlete.active ? "ATIVO" : "INATIVO"}
                tone={athlete.active ? "green" : "gray"}
              />
            </View>
            <Text style={styles.muted}>
              {ageOn(athlete.birthDate)} anos · Faixa {athlete.belt.toLowerCase()}
            </Text>
            <Text style={styles.muted}>
              {groups.find((group) => group.id === athlete.groupId)?.name ?? "Sem turma"}
            </Text>
          </Section>
        ))}
      </View>
      {!filtered.length && (
        <Text style={[styles.muted, { textAlign: "center" }]}>Nenhum aluno encontrado.</Text>
      )}
    </Page>
  );
}
