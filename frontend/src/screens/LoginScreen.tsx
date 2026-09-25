import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState} from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useAccess } from '../features/access/AccessContext'
import type { RootStackParamList } from '../routes/types'
import { useTheme } from '../contexts/ThemeContexts'
import { styles } from './LoginScreen.styles'
import { validarObrigatorio, emailValido, LIMITE_SENHA } from '../utils/validators';

type props = NativeStackScreenProps<RootStackParamList, "Login">

const CORES_BARRA = ['#3B82F6', '#9333EA', '#92400E', '#0A0A0A', '#DC2626'];

function BarraColorida() {
  return (
    <View style={ styles.barra }>
      {CORES_BARRA.map((cor) => (
        <View key={cor} style={{ flex: 1, backgroundColor: cor }} />
      ))}
    </View>
  );
}

export default function LoginScreen() {

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [campoInvalido, setCampoInvalido] = useState<'email' | 'senha' | null>(null);
    const { cores } = useTheme();
    const { login, sessionMessage } = useAccess();

    async function handleLogin() {
        const emailLimpo = email.trim();
        const senhaLimpa = senha;

        const erroEmailObrigatorio = validarObrigatorio(emailLimpo, 'E-mail');
        if (erroEmailObrigatorio) {
            setErro(erroEmailObrigatorio);
            setCampoInvalido('email');
            return;
        }

        const erroSenhaObrigatoria = validarObrigatorio(senhaLimpa, 'Senha');
        if (erroSenhaObrigatoria) {
            setErro(erroSenhaObrigatoria);
            setCampoInvalido('senha');
            return;
        }

        const erroEmail = emailValido(emailLimpo);
        if (erroEmail) {
            setErro(erroEmail);
            setCampoInvalido('email');
            return;
        }

        setErro('');
        setLoading(true);
        try {
            await login(emailLimpo, senhaLimpa);
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: cores.fundo }]}>
            <Image 
                source = {require('../assets/logo_project.png.jpg')}
                style={styles.logo}
            /> 
            <Text style={[styles.titulo, { color: cores.texto }]}>ARTE SUAVE</Text>
            <Text style={[styles.subtitulo, { color: cores.subtexto }]}>ESTILO DE VIDA · QUIXADÁ</Text>
            <Text style={[styles.secao, {color: cores.texto}]}> ENTRAR </Text>
            <View style={[styles.linhaSecao, { backgroundColor: cores.texto }]} />
            <Text style={[styles.label, {color: cores.subtexto}]}> E-MAIL </Text>
            <TextInput
                style={[styles.input, { backgroundColor: cores.inputFundo, borderColor: campoInvalido === 'email' ? '#DC2626' : cores.inputBorda, color: cores.texto }]}
                placeholder="seu@email.com"
                placeholderTextColor={cores.subtexto}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <Text style={[styles.label, {color: cores.subtexto}]}> SENHA </Text>
            <TextInput
                style={[styles.input, { backgroundColor: cores.inputFundo, borderColor: campoInvalido === 'senha' ? '#DC2626' : cores.inputBorda, color: cores.texto }]}
                placeholder="••••••••"
                maxLength={LIMITE_SENHA}
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
            />

            {erro ? <Text style={styles.erro}>{ erro }</Text> : null}
            {sessionMessage ? <Text accessibilityRole="alert" style={{ color: cores.texto, marginBottom: 12 }}>{sessionMessage}</Text> : null}
            <TouchableOpacity 
                onPress={handleLogin}
                style ={[styles.botao, {backgroundColor: cores.botaoFundo}, loading && styles.botaoDesativado]}
                disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color={cores.botaoTexto} />
            ) : (
                <Text style={[styles.botaoTexto, { color: cores.botaoTexto }]}>ACESSAR</Text>
            )}
            </TouchableOpacity>
            <BarraColorida/>
        </View>
    )
}
