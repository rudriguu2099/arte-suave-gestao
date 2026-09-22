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
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export const colors = {
  ink: "#202020",
  muted: "#777777",
  border: "#D4D4D4",
  paper: "#FFFFFF",
  background: "#F3F3F3",
  error: "#A32626",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    gap: 22,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    flexGrow: 1,
  },
  heading: {
    fontFamily: Platform.OS === "android" ? "sans-serif-condensed" : undefined,
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  text: { fontSize: 14, lineHeight: 21, color: colors.ink },
  muted: { fontSize: 12, lineHeight: 18, color: colors.muted },
  label: {
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.9,
    color: colors.ink,
    textTransform: "uppercase",
  },
  titleRule: {
    width: 28,
    height: 2,
    backgroundColor: colors.ink,
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  buttonText: {
    color: colors.paper,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  input: {
    minHeight: 48,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    borderRadius: 1,
  },
  action: {
    backgroundColor: colors.paper,
    minHeight: 48,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
});

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
  disabled,
  compact,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
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
        },
        compact && { paddingHorizontal: 10 },
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: colors.ink },
          compact && { fontSize: 10 },
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
      style={{
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
      }}
    >
      <MaterialIcons name="chevron-left" size={14} color={colors.muted} />
      <Text
        style={[
          styles.muted,
          { fontSize: 11, textDecorationLine: "underline" },
        ]}
      >
        VOLTAR
      </Text>
    </Pressable>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      <View style={styles.titleRule} />
      {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
    </View>
  );
}
export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title && (
        <Text style={[styles.label, { color: colors.muted, marginBottom: 8 }]}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#929292"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && { borderColor: colors.ink },
          props.style,
        ]}
      />
    </View>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.text, { color: colors.error }]}
    >
      {message}
    </Text>
  ) : null;
}
export function Action({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.65 : 1 }]}
    >
      <Text style={[styles.text, { flex: 1 }]}>{title}</Text>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione...",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${options.find((option) => option.value === value)?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.row]}
      >
        <Text style={[styles.text, { flex: 1 }]}>
          {options.find((option) => option.value === value)?.label ??
            placeholder}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={18}
          color={colors.ink}
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
            backgroundColor: "#00000066",
            padding: 24,
          }}
        >
          <View
            accessibilityViewIsModal
            style={[styles.card, { maxHeight: "80%" }]}
          >
            <Text style={styles.heading}>{label}</Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === option.value }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderColor: "#EEEEEE",
                  }}
                >
                  <Text style={styles.text}>
                    {value === option.value ? "● " : "○ "}
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
      style={[styles.row, { minHeight: 44 }]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 1,
          borderColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: value ? colors.ink : colors.paper,
        }}
      >
        <Text style={{ color: "white" }}>{value ? "✓" : ""}</Text>
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
  const label = kind === "email" ? "E-mail" : "Telefone";
  return (
    <View style={{ gap: 8 }}>
      {values.map((value, index) => (
        <View key={index} style={{ gap: 4 }}>
          <Field
            label={`${label} ${index + 1}${required && index === 0 ? " *" : ""}`}
            value={value}
            onChangeText={(text) =>
              onChange(values.map((item, i) => (i === index ? text : item)))
            }
            placeholder={
              kind === "email" ? "email@exemplo.com" : "(00) 00000-0000"
            }
            keyboardType={kind === "email" ? "email-address" : "phone-pad"}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {index > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover ${label} ${index + 1}`}
              onPress={() => onChange(values.filter((_, i) => i !== index))}
              style={{
                minHeight: 36,
                justifyContent: "center",
                alignSelf: "flex-end",
              }}
            >
              <Text style={styles.muted}>Remover</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...values, ""])}
        style={{
          minHeight: 40,
          justifyContent: "center",
          alignSelf: "flex-end",
        }}
      >
        <Text style={styles.muted}>+ Adicionar {label.toLowerCase()}</Text>
      </Pressable>
    </View>
  );
}
