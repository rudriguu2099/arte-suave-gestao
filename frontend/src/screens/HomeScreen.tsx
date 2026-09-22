import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Action, colors, Page, Section, styles } from "../components/ui";
import { AdminFooter, EventCards } from "../components/access";
import { useAccess } from "../features/access/AccessContext";
import { ageOn, isStaff, isSuperAdmin } from "../features/access/domain";
import { roleLabels, type RootStackParamList } from "../features/access/types";

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">) {
  const { current, signOut, athletes, accounts, groups } = useAccess();
  if (!current) return null;
  const admin = isStaff(current);
  const superadmin = isSuperAdmin(current);
  return (
    <Page
      footer={
        admin ? (
          <AdminFooter navigation={navigation} active="Home" />
        ) : undefined
      }
    >
      <View
        style={[
          styles.row,
          {
            marginHorizontal: -24,
            marginTop: -24,
            padding: 22,
            backgroundColor: colors.paper,
            borderBottomWidth: 1,
            borderColor: "#E5E5E5",
          },
        ]}
      >
        <View
          accessibilityLabel="Arte Suave"
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 2,
            borderColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontWeight: "900", fontSize: 18 }}>AS</Text>
          <Text style={{ fontSize: 5, letterSpacing: 0.5 }}>ARTE SUAVE</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.muted }]}>
            {superadmin ? "Superadmin" : roleLabels[current.role]}
          </Text>
          <Text style={[styles.text, { fontWeight: "700" }]}>
            {current.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da sessão"
          onPress={signOut}
          style={{
            minWidth: 44,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <Text style={[styles.label, { textDecorationLine: "underline" }]}>
            SAIR
          </Text>
          <MaterialIcons name="logout" size={15} color={colors.ink} />
        </Pressable>
      </View>
      {admin ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[
            {
              value: athletes.filter((item) => item.active).length,
              label: "Atletas ativos",
            },
            { value: groups.length, label: "Turmas" },
            ...(superadmin
              ? [
                  { value: accounts.length, label: "Contas" },
                  {
                    value: accounts.reduce(
                      (total, account) => total + account.athleteIds.length,
                      0,
                    ),
                    label: "Vínculos",
                  },
                ]
              : []),
          ].map((stat) => (
            <View
              key={stat.label}
              style={[styles.card, { width: "47%", flexGrow: 1, gap: 2 }]}
            >
              <Text style={[styles.heading, { fontSize: 32 }]}>
                {stat.value}
              </Text>
              <Text style={[styles.label, { color: colors.muted }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      ) : athletes.length ? (
        athletes.map((athlete) => {
          const group = groups.find((item) => item.id === athlete.groupId);
          return (
            <View key={athlete.id} style={{ gap: 22 }}>
              <Section>
                <Text
                  style={[styles.label, { textDecorationLine: "underline" }]}
                >
                  {current.role === "athlete"
                    ? "Minha turma"
                    : "Dependente vinculado"}
                </Text>
                <Text
                  style={[styles.text, { fontWeight: "700", fontSize: 16 }]}
                >
                  {current.role === "athlete"
                    ? (group?.name ?? "Sem turma")
                    : athlete.name}
                </Text>
                <Text style={styles.muted}>
                  {current.role === "athlete"
                    ? `${ageOn(athlete.birthDate)} anos · Faixa ${athlete.belt.toLowerCase()}`
                    : group?.name}{" "}
                  · {group?.schedule}
                </Text>
              </Section>
              <Section>
                <Text
                  style={[styles.label, { textDecorationLine: "underline" }]}
                >
                  {current.role === "athlete"
                    ? "Minha frequência"
                    : `Frequência de ${athlete.name}`}{" "}
                  · Setembro/2026
                </Text>
                {athlete.attendance.length ? (
                  <>
                    <View style={[styles.wrap, { maxWidth: 310 }]}>
                      {athlete.attendance.map((present, index) => (
                        <View
                          key={index}
                          accessibilityLabel={`Treino ${index + 1}: ${present ? "realizado" : "não realizado"}`}
                          style={{
                            width: 26,
                            height: 26,
                            backgroundColor: present ? "#111111" : colors.paper,
                            borderWidth: 1,
                            borderColor: "#E4E4E4",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: "white", fontSize: 10 }}>
                            {present ? index + 1 : ""}
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
                  <Text style={styles.muted}>
                    Nenhuma frequência registrada.
                  </Text>
                )}
              </Section>
            </View>
          );
        })
      ) : (
        <Section>
          <Text style={styles.text}>Nenhum atleta vinculado à sua conta.</Text>
          <Text style={styles.muted}>
            Solicite o vínculo à gestão do projeto.
          </Text>
        </Section>
      )}
      <View style={{ gap: 14 }}>
        <Text
          style={[
            styles.label,
            { fontSize: 14, textDecorationLine: "underline" },
          ]}
        >
          PRÓXIMOS EVENTOS
        </Text>
        <EventCards />
      </View>
      {admin && (
        <Text
          style={[
            styles.label,
            { fontSize: 14, textDecorationLine: "underline" },
          ]}
        >
          AÇÕES RÁPIDAS
        </Text>
      )}
      <View style={{ gap: 12 }}>
        {admin && (
          <>
            {superadmin && (
              <Action
                title="Gerenciar contas e perfis"
                onPress={() => navigation.navigate("Accounts")}
              />
            )}
            <Action
              title="Consultar alunos"
              onPress={() => navigation.navigate("Students")}
            />
            <Action
              title="Consultar turmas"
              onPress={() => navigation.navigate("Groups")}
            />
            <Action
              title="Consultar frequência"
              onPress={() => navigation.navigate("Attendance")}
            />
          </>
        )}
        <Action
          title="Alterar minha senha"
          onPress={() => navigation.navigate("Password")}
        />
      </View>
    </Page>
  );
}
