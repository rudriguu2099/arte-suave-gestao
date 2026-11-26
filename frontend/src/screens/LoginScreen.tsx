import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { styles } from "./LoginScreen.styles";
import { validarObrigatorio, emailValido, LIMITE_SENHA } from "../utils/validators";

const CORES_BARRA = ["#60A5FA", "#A855F7", "#B4693E", "#4B5563", "#EF4444"];

function BarraColorida() {
  return (
    <View style={styles.barra}>
      {CORES_BARRA.map((cor) => (
        <View key={cor} style={[styles.faixaDash, { backgroundColor: cor }]} />
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const { login, sessionMessage } = useAccess();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [campoInvalido, setCampoInvalido] = useState<"email" | "senha" | null>(null);
  const [foco, setFoco] = useState<"email" | "senha" | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cardYRef = useRef(0);
  const senhaInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  function scrollToCard() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, cardYRef.current - 20),
        animated: true,
      });
    }, 80);
  }

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      scrollToCard();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  async function handleLogin() {
    Keyboard.dismiss();
    const emailLimpo = email.trim();
    const senhaLimpa = senha;

    const erroEmailObrigatorio = validarObrigatorio(emailLimpo, "E-mail");
    if (erroEmailObrigatorio) {
      setErro(erroEmailObrigatorio);
      setCampoInvalido("email");
      return;
    }

    const erroSenhaObrigatoria = validarObrigatorio(senhaLimpa, "Senha");
    if (erroSenhaObrigatoria) {
      setErro(erroSenhaObrigatoria);
      setCampoInvalido("senha");
      return;
    }

    const erroEmail = emailValido(emailLimpo);
    if (erroEmail) {
      setErro(erroEmail);
      setCampoInvalido("email");
      return;
    }

    setErro("");
    setCampoInvalido(null);
    setLoading(true);
    try {
      await login(emailLimpo, senhaLimpa);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === "android" && keyboardHeight > 0
              ? { paddingBottom: keyboardHeight + 32, justifyContent: "flex-start" }
              : null,
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRing}>
            <Image
              source={require("../assets/logo_project.png.jpg")}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.titulo}>ARTE SUAVE</Text>
          <Text style={styles.subtitulo}>ESTILO DE VIDA · QUIXADÁ, CE</Text>

          <View
            style={styles.card}
            onLayout={(event) => {
              cardYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.secao}>BEM-VINDO DE VOLTA</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-MAIL</Text>
              <TextInput
                style={[
                  styles.input,
                  foco === "email" && styles.inputFocused,
                  campoInvalido === "email" && styles.inputInvalido,
                ]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => senhaInputRef.current?.focus()}
                value={email}
                onFocus={() => {
                  setFoco("email");
                  scrollToCard();
                }}
                onBlur={() => setFoco(null)}
                onChangeText={(value) => {
                  setEmail(value);
                  if (campoInvalido === "email") setCampoInvalido(null);
                }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>SENHA</Text>
              <TextInput
                ref={senhaInputRef}
                style={[
                  styles.input,
                  foco === "senha" && styles.inputFocused,
                  campoInvalido === "senha" && styles.inputInvalido,
                ]}
                placeholder="••••••••"
                maxLength={LIMITE_SENHA}
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                value={senha}
                onFocus={() => {
                  setFoco("senha");
                  scrollToCard();
                }}
                onBlur={() => setFoco(null)}
                onChangeText={(value) => {
                  setSenha(value);
                  if (campoInvalido === "senha") setCampoInvalido(null);
                }}
              />
            </View>

            {erro ? (
              <View style={styles.erroBox}>
                <Text style={styles.erro}>{erro}</Text>
              </View>
            ) : null}

            {sessionMessage ? (
              <View style={styles.mensagemSessaoBox}>
                <Text accessibilityRole="alert" style={styles.mensagemSessao}>
                  {sessionMessage}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.botao, loading && styles.botaoDesativado]}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <Text style={styles.botaoTexto}>ACESSAR SISTEMA</Text>
              )}
            </TouchableOpacity>
          </View>

          <BarraColorida />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
