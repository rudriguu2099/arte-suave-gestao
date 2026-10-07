import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  Page,
  Heading,
  Button,
  Field,
  Select,
  Back,
  styles as globalStyles,
  colors,
} from "../components/ui";

import { AdminFooter } from "../components/access";
import { useAccess } from "../features/access/AccessContext";
import { ageOn } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import { getStudents, type Student } from "../services/students";

type AtletasScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Students">;
};

const statusOptions = [
  { label: "Todos", value: "" },
  { label: "Ativos", value: "true" },
  { label: "Inativos", value: "false" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

const isMinor = (birthDate: string) => {
  const age = ageOn(birthDate);
  return age >= 0 && age < 18;
};

export default function AtletasScreen({ navigation }: AtletasScreenProps) {
  const { groups, getToken, signOut } = useAccess();

  const [athletes, setAthletes] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [active, setActive] = useState("");

  const groupOptions = useMemo(
    () => [
      { label: "Todas as turmas", value: "" },
      ...groups.map((g) => ({ label: g.name, value: g.id })),
    ],
    [groups],
  );

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getStudents(
          {
            search: search.trim() || undefined,
            groupId: groupId || undefined,
            active: active === "" ? undefined : active === "true",
          },
          getToken(),
        );
        if (!cancelled) setAthletes(data);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) signOut();
        else setError(e instanceof Error ? e.message : "Não foi possível carregar os atletas.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, groupId, active]);

  return (
    <Page
      footer={<AdminFooter navigation={navigation as any} active="Students" />}
    >
      <Back onPress={() => navigation.goBack()} />

      <Heading title="ATLETAS" subtitle="Cadastro, busca e filtros" />

      {/* Área de Filtros (HU014) */}
      <View style={{ marginTop: 16, gap: 12 }}>
        <Field
          label=""
          placeholder="Buscar por nome..."
          value={search}
          onChangeText={setSearch}
        />

        <View style={globalStyles.row}>
          <View style={{ flex: 2 }}>
            <Select
              label=""
              placeholder="Todas as turmas"
              value={groupId}
              options={groupOptions}
              onChange={setGroupId}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Select
              label=""
              placeholder="Todos"
              value={active}
              options={statusOptions}
              onChange={setActive}
            />
          </View>
        </View>
      </View>

      {!!error && (
        <Text style={[globalStyles.text, { color: colors.error, marginTop: 16 }]}>
          {error}
        </Text>
      )}

      {/* Lista de Atletas */}
      <View style={{ marginTop: 24, gap: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 20 }} />
        ) : !error && athletes.length === 0 ? (
          <Text style={[globalStyles.muted, { textAlign: "center", marginTop: 20 }]}>
            Nenhum atleta encontrado.
          </Text>
        ) : (
          athletes.map((athlete) => (
            <View
              key={athlete.id}
              style={[globalStyles.card, !athlete.active && { opacity: 0.5 }]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={globalStyles.wrap}>
                    <Text style={[globalStyles.text, { fontWeight: "bold", fontSize: 16 }]}>
                      {athlete.name}
                    </Text>

                    <View style={styles.tagDark}>
                      <Text style={styles.tagTextLight}>
                        {isMinor(athlete.birthDate) ? "MENOR" : "ADULTO"}
                      </Text>
                    </View>

                    {!athlete.active && (
                      <View style={styles.tagLight}>
                        <Text style={styles.tagTextDark}>INATIVO</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[globalStyles.muted, { marginTop: 4, fontSize: 11 }]}>
                    {athlete.group?.name ?? "Sem turma"} - {formatDate(athlete.birthDate)}
                    {athlete.guardianName ? ` - Resp: ${athlete.guardianName}` : ""}
                  </Text>
                </View>

                <View style={{ alignItems: "center", marginLeft: 12 }}>
                  <Text style={{ fontWeight: "800", fontSize: 18, color: colors.ink }}>
                    {athlete.absenceCount}
                  </Text>
                  <Text
                    style={{
                      fontSize: 8,
                      color: colors.muted,
                      fontWeight: "bold",
                      letterSpacing: 0.5,
                    }}
                  >
                    FALTAS
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <Button compact secondary title="Editar" onPress={() => console.log("Editar", athlete.id)} />
                <Button compact secondary title="FREQ." onPress={() => console.log("Frequência", athlete.id)} />
              </View>
            </View>
          ))
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  tagDark: {
    backgroundColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
    justifyContent: "center",
  },
  tagTextLight: {
    color: colors.paper,
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  tagLight: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
    justifyContent: "center",
  },
  tagTextDark: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});