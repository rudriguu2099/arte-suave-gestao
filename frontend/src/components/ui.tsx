import { emailValido, telefoneValido, formatarTelefone } from "../utils/validators";
import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { formatBirthDate } from "../features/access/domain";

export const colors = {
  primary: "#7C00FF",
  primaryDark: "#6300CC",
  primaryLight: "#A855F7",
  primarySoft: "#F3EBFF",
  primaryBorder: "#DFCFFB",
  accent: "#D946EF",
  pinkSoft: "#FCE7F6",
  pink: "#A21CAF",
  ink: "#1E1035",
  text: "#2A1B40",
  muted: "#7E7494",
  placeholder: "#ABA2BC",
  border: "#E8E2F3",
  divider: "#EFEAF8",
  paper: "#FFFFFF",
  background: "#F6F4FA",
  surface: "#F3F0F9",
  error: "#E11D48",
  errorBg: "#FFF1F2",
  errorBorder: "#FECDD3",
  success: "#059669",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  warning: "#EA580C",
  warningBg: "#FFF7ED",
  warningBorder: "#FED7AA",
  info: "#2563EB",
  infoBg: "#EFF6FF",
  infoBorder: "#BFDBFE",
  grayBg: "#F3F4F6",
  grayBorder: "#E5E7EB",
  grayText: "#6B7280",
};

export const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {
    elevation: 2,
  },
  default: {
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
}) as ViewStyle;

export const primaryShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
}) as ViewStyle;

export function Dialog({
  visible,
  title,
  message,
  onClose,
  confirmLabel = "CONCLUIR",
  onConfirm,
  busy = false,
  danger = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "rgba(30, 16, 53, 0.45)",
        }}
      >
        <View
          accessibilityViewIsModal
          style={[styles.card, { width: "100%", maxWidth: 440, padding: 22, gap: 14, borderRadius: 22 }]}
        >
          <View>
            <Text accessibilityRole="header" style={[styles.heading, { fontSize: 20 }]}>
              {title}
            </Text>
            <AccentBar />
          </View>
          <Text selectable style={[styles.text, { color: colors.muted }]}>
            {message}
          </Text>
          <View style={[styles.row, { marginTop: 4 }]}>
            {onConfirm && (
              <View style={{ flex: 1 }}>
                <Button
                  title="CANCELAR"
                  secondary
                  disabled={busy}
                  onPress={onClose}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                title={busy ? "AGUARDE..." : confirmLabel}
                danger={danger}
                disabled={busy}
                onPress={onConfirm ?? onClose}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 20,
    gap: 18,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    flexGrow: 1,
  },
  heading: {
    fontFamily: Platform.OS === "android" ? "sans-serif-condensed" : undefined,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: colors.ink,
  },
  text: { fontSize: 14, lineHeight: 20, color: colors.text },
  muted: { fontSize: 12, lineHeight: 18, color: colors.muted },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
    textTransform: "uppercase",
  },
  titleRule: {
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    ...cardShadow,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    ...primaryShadow,
  },
  buttonText: {
    color: colors.paper,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1.1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    borderRadius: 14,
  },
  action: {
    backgroundColor: colors.paper,
    minHeight: 54,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    ...cardShadow,
  },
});

function AccentBar() {
  return (
    <View
      style={{
        width: 44,
        height: 4,
        borderRadius: 99,
        overflow: "hidden",
        flexDirection: "row",
        marginTop: 8,
        marginBottom: 6,
        backgroundColor: colors.primary,
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.primary }} />
      <View style={{ flex: 1, backgroundColor: colors.primaryLight }} />
      <View style={{ flex: 0.7, backgroundColor: colors.accent }} />
    </View>
  );
}

export function HeaderBand({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          marginHorizontal: -20,
          marginTop: -20,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 20,
          gap: 16,
          backgroundColor: colors.paper,
          borderBottomWidth: 1,
          borderColor: colors.divider,
          ...cardShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({
  title,
  dash = false,
}: {
  title: string;
  dash?: boolean;
}) {
  return (
    <View style={[styles.row, { gap: 8 }]}>
      {dash ? (
        <View
          style={{
            width: 14,
            height: 2,
            borderRadius: 99,
            backgroundColor: colors.primaryBorder,
          }}
        />
      ) : (
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primaryLight,
            }}
          />
        </View>
      )}
      <Text style={styles.label}>{title}</Text>
    </View>
  );
}

export type BadgeTone =
  | "purple"
  | "lavender"
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "gray";

const badgeTones: Record<BadgeTone, { bg: string; border: string; text: string }> = {
  purple: { bg: colors.primary, border: colors.primary, text: colors.paper },
  lavender: { bg: colors.primarySoft, border: colors.primaryBorder, text: colors.primary },
  blue: { bg: colors.infoBg, border: colors.infoBorder, text: colors.info },
  green: { bg: colors.successBg, border: colors.successBorder, text: colors.success },
  red: { bg: colors.errorBg, border: colors.errorBorder, text: colors.error },
  amber: { bg: colors.warningBg, border: colors.warningBorder, text: colors.warning },
  gray: { bg: colors.grayBg, border: colors.grayBorder, text: colors.grayText },
};

export function Badge({
  label,
  tone = "lavender",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const palette = badgeTones[tone];
  return (
    <View
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: palette.text,
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function Page({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView
      style={styles.page}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  secondary,
  danger,
  disabled,
  compact,
  pill,
  style,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  compact?: boolean;
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && {
          backgroundColor: colors.paper,
          borderColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        },
        danger && {
          backgroundColor: colors.errorBg,
          borderColor: colors.errorBorder,
          shadowOpacity: 0,
          elevation: 0,
        },
        compact && {
          minHeight: 32,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          shadowOpacity: secondary || danger ? 0 : 0.16,
          elevation: secondary || danger ? 0 : 2,
        },
        pill && { borderRadius: 999 },
        style,
        { opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: colors.muted, fontWeight: "700" },
          danger && { color: colors.error, fontWeight: "700" },
          compact && { fontSize: 10, letterSpacing: 0.8 },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        minHeight: 32,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 2,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <MaterialIcons name="chevron-left" size={18} color={colors.muted} />
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.2,
        }}
      >
        VOLTAR
      </Text>
    </Pressable>
  );
}

export function Heading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={[styles.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.heading}>
          {title}
        </Text>
        <AccentBar />
        {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Section({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <View style={{ marginBottom: 4 }}>
          <SectionLabel title={title} />
        </View>
      )}
      {children}
    </View>
  );
}

export function Field({
  label,
  surface,
  ...props
}: TextInputProps & { label: string; surface?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        accessibilityLabel={label || props.placeholder}
        placeholderTextColor={colors.placeholder}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          surface && { backgroundColor: colors.surface },
          props.editable === false && { backgroundColor: colors.surface, color: colors.muted },
          focused && { borderColor: colors.primary },
          props.style,
        ]}
      />
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <View
      style={{
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.text, { color: colors.error, fontSize: 13, fontWeight: "600" }]}
      >
        {message}
      </Text>
    </View>
  ) : null;
}

export function Action({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.72 : 1 }]}
    >
      {icon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.text, { flex: 1, fontWeight: "600" }]}>{title}</Text>
      <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione...",
  surface,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  surface?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}: ${selectedOption?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[
          styles.input,
          styles.row,
          surface && { backgroundColor: colors.surface },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.text,
            { flex: 1, color: selectedOption ? colors.ink : colors.placeholder },
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={20}
          color={colors.muted}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(30, 16, 53, 0.45)",
            padding: 24,
          }}
        >
          <View
            accessibilityViewIsModal
            style={[styles.card, { maxHeight: "80%", borderRadius: 22, padding: 20 }]}
          >
            <Text style={[styles.heading, { fontSize: 18 }]}>
              {label || placeholder}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const selected = value === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 14,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      backgroundColor: selected
                        ? colors.primarySoft
                        : pressed
                          ? colors.surface
                          : "transparent",
                      borderBottomWidth: 1,
                      borderColor: colors.divider,
                    })}
                  >
                    <MaterialIcons
                      name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                      size={18}
                      color={selected ? colors.primary : colors.muted}
                    />
                    <Text
                      style={[
                        styles.text,
                        {
                          flex: 1,
                          fontWeight: selected ? "700" : "400",
                          color: selected ? colors.primary : colors.ink,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button title="Fechar" secondary onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

LocaleConfig.locales["pt-br"] = {
  monthNames: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  dayNames: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
  dayNamesShort: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"],
  today: "Hoje",
};
LocaleConfig.defaultLocale = "pt-br";

// Data digitada (máscara dd/mm/aaaa) ou escolhida no calendário (react-native-calendars, que trabalha em AAAA-MM-DD).
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split("/").reverse().join("-") : undefined;
  return (
    <View style={[styles.row, { alignItems: "flex-end", gap: 8 }]}>
      <View style={{ flex: 1 }}>
        <Field
          label={label}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          value={value}
          onChangeText={(text) => onChange(formatBirthDate(text))}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: abrir calendário`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          {
            width: 48,
            paddingHorizontal: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primarySoft,
            borderColor: colors.primaryBorder,
            opacity: pressed ? 0.65 : 1,
          },
        ]}
      >
        <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(30, 16, 53, 0.45)",
            padding: 24,
          }}
        >
          <View accessibilityViewIsModal style={[styles.card, { width: "100%", maxWidth: 380, borderRadius: 22 }]}>
            <Calendar
              current={iso}
              hideExtraDays={false}
              markedDates={iso ? { [iso]: { selected: true } } : undefined}
              onDayPress={(day) => {
                onChange(day.dateString.split("-").reverse().join("/"));
                setOpen(false);
              }}
              theme={{
                arrowColor: colors.primary,
                monthTextColor: colors.ink,
                textSectionTitleColor: colors.muted,
                dayTextColor: colors.ink,
                textDisabledColor: colors.placeholder,
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.paper,
              }}
            />
            <Button title="Fechar" secondary onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.row, { minHeight: 40 }]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: value ? colors.primary : colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: value ? colors.primary : colors.paper,
        }}
      >
        {value && <MaterialIcons name="check" size={14} color={colors.paper} />}
      </View>
      <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

export function Contacts({
  kind,
  values,
  onChange,
  required,
}: {
  kind: "email" | "phone";
  values: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
}) {
  const [touched, setTouched] = useState<Record<number, boolean>>({});
  const label = kind === "email" ? "E-mail" : "Telefone";
  return (
    <View style={{ gap: 8 }}>
      {(kind === "email" ? [values[0] ?? ""] : values).map((value, index) => (
        <View key={index} style={{ gap: 4 }}>
          <Field
            label={`${label}${kind === "phone" ? ` ${index + 1}` : ""}${required && index === 0 ? " *" : ""}`}
            value={kind === "phone" ? formatarTelefone(value) : value}
            onBlur={() => setTouched((previous) => ({ ...previous, [index]: true }))}
            onChangeText={(text) =>
              onChange(
                kind === "email"
                  ? [text]
                  : values.map((item, i) => (i === index ? formatarTelefone(text) : item)),
              )
            }
            placeholder={kind === "email" ? "email@exemplo.com" : "(00) 00000-0000"}
            keyboardType={kind === "email" ? "email-address" : "phone-pad"}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {touched[index] && !!value && (
            <ErrorMessage message={(kind === "email" ? emailValido(value) : telefoneValido(value)) ?? ""} />
          )}
          {kind === "phone" && index > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover ${label} ${index + 1}`}
              onPress={() => onChange(values.filter((_, i) => i !== index))}
              style={{
                minHeight: 30,
                justifyContent: "center",
                alignSelf: "flex-end",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.error }}>Remover</Text>
            </Pressable>
          )}
        </View>
      ))}
      {kind === "phone" && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange([...values, ""])}
          style={({ pressed }) => ({
            minHeight: 42,
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.primaryBorder,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
            + Adicionar telefone
          </Text>
        </Pressable>
      )}
    </View>
  );
}
