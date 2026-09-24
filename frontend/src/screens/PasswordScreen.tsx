import { useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Back,
  Button,
  Check,
  ErrorMessage,
  Dialog,
  Field,
  Heading,
  Page,
  Section,
  styles,
} from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { canChangePassword } from "../features/access/domain";
import type { RootStackParamList } from "../features/access/types";

export default function PasswordScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Password">) {
  const { current, accounts, changePassword } = useAccess();
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const targetId = route.params?.accountId ?? current?.id;
  const target = accounts.find((account) => account.id === targetId);
  const other = targetId !== current?.id;
  if (!current || !target || !canChangePassword(current, target.id, target.role))
    return (
      <Page>
        <Back onPress={navigation.goBack} />
        <ErrorMessage message="Conta indisponível para alteração de senha." />
      </Page>
    );
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await changePassword(target!.id, password, confirmation, currentPassword);
      setPassword("");
      setConfirmation("");
      setError("");
      if (other) setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page>
      <Dialog
        visible={success}
        title="Senha redefinida"
        message="A nova senha foi salva. O usuário deverá entrar novamente."
        onClose={() => navigation.goBack()}
      />
      <Back onPress={navigation.goBack} />
      <Heading
        title={other ? "REDEFINIR SENHA" : "ALTERAR MINHA SENHA"}
        subtitle={
          other
            ? `Conta de ${target.name}. Não exige confirmação por e-mail.`
            : "Você pode alterar sua senha quando quiser."
        }
      />
      <View style={{ marginTop: 44 }}>
        <Section>
          <View style={{ alignItems: "center", marginVertical: 10 }}>
            <Text style={styles.heading}>Criar nova senha</Text>
            <View style={styles.titleRule} />
          </View>
          {!other && (
            <Field
              label="Senha atual *"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
          )}
          <Field
            label="Nova senha *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
          />
          <Field
            label="Repita a senha *"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
          />
          <Check label="Mostrar senhas" value={visible} onChange={setVisible} />
          <ErrorMessage message={error} />
          <View
            style={[
              styles.row,
              {
                justifyContent: "space-between",
                marginTop: 24,
                flexWrap: "wrap",
              },
            ]}
          >
            <Button
              title="CANCELAR"
              secondary
              disabled={saving}
              onPress={navigation.goBack}
            />
            <Button
              title={saving ? "SALVANDO..." : other ? "REDEFINIR" : "ALTERAR"}
              disabled={saving}
              onPress={save}
            />
          </View>
        </Section>
      </View>
    </Page>
  );
}
