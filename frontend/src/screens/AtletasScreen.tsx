import { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import {
  Page,
  HeaderBand,
  Heading,
  Badge,
  Button,
  Field,
  Select,
  Back,
  ErrorMessage,
  styles as globalStyles,
  colors,
} from "../components/ui";

import { AdminFooter } from "../components/access";
import { useAccess } from "../features/access/AccessContext";
import type { RootStackParamList } from "../features/access/types";
import { ApiError } from "../services/api";
import { getStudents, type Student } from "../services/students";

type AtletasScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Students">;
  route: RouteProp<RootStackParamList, "Students">;
};

const statusOptions = [
  { label: "Todos", value: "" },
  { label: "Ativos", value: "true" },
  { label: "Inativos", value: "false" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

const isMinor = (athlete: Student) => {
  if (athlete.guardian) return true;

  const birth = new Date(athlete.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  return age >= 0 && age < 18;
};

export default function AtletasScreen({ navigation, route }: AtletasScreenProps) {
  const { groups, getToken, signOut } = useAccess();

  const lockedGroupId = route.params?.groupId;
  const lockedGroup = groups.find((g) => g.id === lockedGroupId);

  const [athletes, setAthletes] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState(route.params?.groupId ?? "");
  const [active, setActive] = useState("");

  const groupOptions = useMemo(
    () => [
      { label: "Todas as turmas", value: "" },
      ...groups.map((g) => ({ label: g.name, value: g.id })),
    ],
    [groups],
  );

  useEffect(() => {
    setGroupId(route.params?.groupId ?? "");
  }, [route.params?.groupId]);

  const effectiveGroupId = lockedGroupId ?? groupId;

  const loadAthletes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStudents(
        {
          search: search.trim() || undefined,
          groupId: effectiveGroupId || undefined,
          active: active === "" ? undefined : active === "true",
        },
        getToken(),
      );
      setAthletes(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) signOut();
      else setError(e instanceof Error ? e.message : "Não foi possível carregar os atletas.");
    } finally {
      setLoading(false);
    }
  }, [search, effectiveGroupId, active, getToken, signOut]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAthletes();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [loadAthletes]);

  useEffect(() => {
    return navigation.addListener("focus", () => {
      void loadAthletes();
    });
  }, [navigation, loadAthletes]);

  return (
    <Page footer={<AdminFooter navigation={navigation} active="Students" />}>
      <HeaderBand>
        {!!lockedGroup && <Back onPress={() => navigation.goBack()} />}

        <Heading
          title="ATLETAS"
          subtitle={lockedGroup ? lockedGroup.name : undefined}
        />

        {lockedGroup ? (
          <View style={[globalStyles.row, { alignItems: "stretch" }]}>
            {lockedGroup.active && (
              <View style={{ flex: 1 }}>
                <Button
                  title="REALIZAR CHAMADA"
                  onPress={() => navigation.navigate("AttendanceForm", { groupId: lockedGroup.id })}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                title="HISTÓRICO"
                secondary
                onPress={() => navigation.navigate("AttendanceHistory", { groupId: lockedGroup.id })}
              />
            </View>
          </View>
        ) : (
          <View style={globalStyles.row}>
            <View style={{ flex: 1 }}>
              <Button
                title="+ NOVO ATLETA"
                onPress={() => navigation.navigate("AccountForm", { defaultRole: "athlete" })}
              />
            </View>
            <Button
              title="TURMAS"
              secondary
              onPress={() => navigation.navigate("Groups")}
              style={{ paddingHorizontal: 18 }}
            />
          </View>
        )}

        {/* Área de Filtros */}
        <View style={{ gap: 10 }}>
          <Field
            label=""
            surface
            placeholder="Buscar por nome..."
            value={search}
            onChangeText={setSearch}
          />

          <View style={globalStyles.row}>
            {!lockedGroupId && (
              <View style={{ flex: 2 }}>
                <Select
                  label=""
                  surface
                  placeholder="Todas as turmas"
                  value={groupId}
                  options={groupOptions}
                  onChange={setGroupId}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Select
                label=""
                surface
                placeholder="Todos"
                value={active}
                options={statusOptions}
                onChange={setActive}
              />
            </View>
          </View>
        </View>
      </HeaderBand>

      <ErrorMessage message={error} />

      {/* Lista de Atletas */}
      <View style={{ gap: 12 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : !error && athletes.length === 0 ? (
          <View style={[globalStyles.card, { alignItems: "center", paddingVertical: 24 }]}>
            <Text style={globalStyles.muted}>Nenhum atleta encontrado.</Text>
          </View>
        ) : (
          athletes.map((athlete) => {
            const minor = isMinor(athlete);
            const highAbsences = athlete.absenceCount >= 3;
            return (
              <View
                key={athlete.id}
                style={[globalStyles.card, !athlete.active && { opacity: 0.55 }]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={globalStyles.wrap}>
                      <Text
                        style={[
                          globalStyles.text,
                          { fontWeight: "800", fontSize: 16, color: colors.ink },
                        ]}
                      >
                        {athlete.name}
                      </Text>

                      <Badge
                        label={minor ? "MENOR" : "ADULTO"}
                        tone={minor ? "lavender" : "blue"}
                      />

                      {!athlete.active && <Badge label="INATIVO" tone="gray" />}
                    </View>

                    <Text style={[globalStyles.muted, { fontSize: 12 }]}>
                      {athlete.group?.name ?? "Sem turma"} · {formatDate(athlete.birthDate)}
                      {athlete.guardian?.name ? ` · Resp.: ${athlete.guardian.name}` : ""}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                    <Text
                      style={{
                        fontWeight: "900",
                        fontSize: 22,
                        lineHeight: 24,
                        color: highAbsences ? colors.warning : "#C3B9D6",
                      }}
                    >
                      {athlete.absenceCount}
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        color: colors.muted,
                        fontWeight: "700",
                        letterSpacing: 0.6,
                      }}
                    >
                      FALTAS
                    </Text>
                  </View>
                </View>

                <View style={[globalStyles.wrap, { gap: 8, marginTop: 2 }]}>
                  <Button
                    compact
                    secondary
                    title="EDITAR"
                    onPress={() => navigation.navigate("AccountForm", { athleteId: athlete.id })}
                  />
                  <Button
                    compact
                    secondary
                    title="FREQUÊNCIA"
                    onPress={() => navigation.navigate("AttendanceHistory", { studentId: athlete.id })}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </Page>
  );
}
