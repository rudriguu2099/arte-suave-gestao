import { Image, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, styles } from "./ui";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, isSuperAdmin } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";

export function BrandAvatar({ size = 46 }: { size?: number }) {
  const ring = Math.max(3, Math.round(size * 0.08));
  return (
    <View
      accessibilityLabel="Arte Suave"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: ring,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Image
        source={require("../assets/logo_project.png.jpg")}
        style={{
          width: size - ring * 2,
          height: size - ring * 2,
          borderRadius: (size - ring * 2) / 2,
          backgroundColor: colors.paper,
        }}
        resizeMode="cover"
      />
    </View>
  );
}

type AdminActive =
  | "Home"
  | "Accounts"
  | "Responsibles"
  | "Finance"
  | "Groups"
  | "Students"
  | "Attendance";

export function AdminFooter({
  navigation,
  active,
}: {
  navigation: Pick<NativeStackNavigationProp<RootStackParamList>, "navigate">;
  active: AdminActive;
}) {
  const { current } = useAccess();
  if (!isStaff(current)) return null;
  const superadmin = isSuperAdmin(current);

  const items = superadmin
    ? ([
        { route: "Home", icon: "home", label: "INÍCIO" },
        { route: "Students", icon: "people-outline", label: "ATLETAS" },
        { route: "Finance", icon: "account-balance-wallet", label: "FINANÇAS" },
        { route: "Attendance", icon: "check-circle-outline", label: "FREQUÊNCIA" },
      ] as const)
    : ([
        { route: "Home", icon: "home", label: "INÍCIO" },
        { route: "Students", icon: "people-outline", label: "ATLETAS" },
        { route: "Groups", icon: "calendar-today", label: "TURMAS" },
        { route: "Attendance", icon: "check-circle-outline", label: "FREQUÊNCIA" },
      ] as const);

  // Mapeia subtelas para a aba pai no rodapé (ex.: Contas/Responsáveis -> Início, Turmas -> Atletas no superadmin).
  const activeTab: AdminActive =
    active === "Accounts" || active === "Responsibles"
      ? "Home"
      : active === "Groups" && superadmin
        ? "Students"
        : active;

  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.paper,
        shadowColor: "#4C1D95",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      {items.map((item) => {
        const selected = activeTab === item.route;
        const tint = selected ? colors.primary : "#9A91AE";
        return (
          <Pressable
            key={item.route}
            accessibilityRole="tab"
            accessibilityLabel={item.route === "Finance" ? "Gestão financeira" : item.label}
            accessibilityState={{ selected }}
            onPress={() => navigation.navigate(item.route)}
            style={{
              flex: 1,
              minHeight: 62,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {selected && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  width: 32,
                  height: 3,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  backgroundColor: colors.primary,
                }}
              />
            )}
            <MaterialIcons name={item.icon} size={22} color={tint} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                fontSize: 9.5,
                fontWeight: selected ? "800" : "600",
                letterSpacing: 0.5,
                color: tint,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type UserTab = "attendance" | "notifications" | "profile";

export function UserFooter({
  active,
  onSelect,
  notificationCount = 0,
}: {
  active: UserTab;
  onSelect: (tab: UserTab) => void;
  notificationCount?: number;
}) {
  const items: { key: UserTab; icon: keyof typeof MaterialIcons.glyphMap; label: string; badge?: number }[] = [
    { key: "attendance", icon: "check-circle-outline", label: "FREQUÊNCIA" },
    { key: "notifications", icon: "notifications-none", label: "NOTIFICAÇÕES", badge: notificationCount },
    { key: "profile", icon: "person-outline", label: "PERFIL" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.paper,
        shadowColor: "#4C1D95",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      {items.map((item) => {
        const selected = active === item.key;
        const tint = selected ? colors.primary : "#9A91AE";
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(item.key)}
            style={{
              flex: 1,
              minHeight: 62,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {selected && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  width: 32,
                  height: 3,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  backgroundColor: colors.primary,
                }}
              />
            )}
            <View style={{ position: "relative" }}>
              <MaterialIcons name={item.icon} size={22} color={tint} />
              {!!item.badge && item.badge > 0 && !selected && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    paddingHorizontal: 4,
                    backgroundColor: colors.error,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.paper, fontSize: 9, fontWeight: "800" }}>
                    {item.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                fontSize: 9.5,
                fontWeight: selected ? "800" : "600",
                letterSpacing: 0.5,
                color: tint,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NotificationCards() {
  const { events } = useAccess();
  if (!events.length) {
    return (
      <View style={[styles.card, { alignItems: "center", paddingVertical: 22 }]}>
        <Text style={styles.muted}>Nenhuma notificação no momento.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {events.map((event) => (
        <View
          key={event.id}
          style={[
            styles.card,
            styles.row,
            {
              padding: 16,
              borderColor: colors.primaryLight,
              alignItems: "flex-start",
            },
          ]}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name={event.kind === "meeting" ? "chat-bubble-outline" : "notifications-none"}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.text, { fontWeight: "700", fontSize: 15, color: colors.ink }]}>
              {event.name}
            </Text>
            <Text style={[styles.muted, { fontSize: 12 }]}>
              {event.date} · {event.location}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
