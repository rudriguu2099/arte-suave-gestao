import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Back,
  Button,
  Check,
  ErrorMessage,
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
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const targetId = route.params?.accountId ?? current?.id;
  const target = accounts.find((account) => account.id === targetId);
  const other = targetId !== current?.id;
  if (!current || !target || !canChangePassword(current, target.id))
    return (
      <Page>
        <Back onPress={navigation.goBack} />
        <ErrorMessage message="Conta indisponível para alteração de senha." />
      </Page>
    );
  function save() {
    try {
      changePassword(target!.id, password, confirmation);
      setPassword("");
      setConfirmation("");
      setError("");
      Alert.alert(
        "Validação concluída",
        "Demonstração: os campos foram validados. A alteração real da senha depende da integração com a API.",
        [{ text: "Concluir", onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Page>
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
            <Button title="CANCELAR" secondary onPress={navigation.goBack} />
            <Button title={other ? "REDEFINIR" : "ALTERAR"} onPress={save} />
          </View>
        </Section>
      </View>
    </Page>
  );
}
