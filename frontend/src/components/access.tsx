import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, styles } from "./ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, isSuperAdmin } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";

export function AdminFooter({
  navigation,
  active,
}: {
  navigation: Pick<NativeStackNavigationProp<RootStackParamList>, "navigate">;
  active:
    | "Home"
    | "Accounts"
    | "Finance"
    | "Groups"
    | "Events"
    | "Students"
    | "Attendance";
}) {
  const { current } = useAccess();
  if (!isStaff(current)) return null;
  const items = isSuperAdmin(current)
    ? ([
        { route: "Home", icon: "home", label: "Início" },
        { route: "Accounts", icon: "people-outline", label: "Contas" },
        { route: "Finance", icon: "payments", label: "Financeiro" },
        { route: "Groups", icon: "content-copy", label: "Turmas" },
        { route: "Events", icon: "event", label: "Eventos" },
      ] as const)
    : ([
        { route: "Home", icon: "home", label: "Início" },
        { route: "Groups", icon: "content-copy", label: "Turmas" },
        { route: "Students", icon: "people-outline", label: "Alunos" },
        { route: "Attendance", icon: "fact-check", label: "Frequência" },
      ] as const);
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.paper,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingTop: 6,
      }}
    >
      {items.map((item) => (
        <Pressable
          key={item.route}
          accessibilityRole="tab"
          accessibilityLabel={
            item.route === "Finance" ? "Gestão financeira" : item.label
          }
          accessibilityState={{ selected: active === item.route }}
          onPress={() => navigation.navigate(item.route)}
          style={{
            flex: 1,
            minHeight: 54,
            gap: 3,
            alignItems: "center",
            justifyContent: "center",
            opacity: active === item.route ? 1 : 0.55,
          }}
        >
          <MaterialIcons name={item.icon} size={24} color={colors.ink} />
          <Text style={{ fontSize: 10, color: colors.ink }}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function EventCards() {
  const { events } = useAccess();
  return (
    <View style={{ gap: 8 }}>
      {events.map((event) => (
        <View key={event.id} style={[styles.card, styles.row, { padding: 12 }]}>
          <MaterialIcons
            name={
              event.kind === "meeting" ? "chat-bubble-outline" : "emoji-events"
            }
            size={18}
            color={colors.ink}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.text}>{event.name}</Text>
            <Text style={[styles.muted, { fontSize: 10 }]}>
              {event.date} · {event.location}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
