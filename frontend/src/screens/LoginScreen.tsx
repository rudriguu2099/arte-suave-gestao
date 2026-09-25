import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState} from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useAccess } from '../features/access/AccessContext'
import { styles } from './LoginScreen.styles'
import { validarObrigatorio, emailValido, LIMITE_SENHA } from '../utils/validators';

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

    const { login, sessionMessage } = useAccess();
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [campoInvalido, setCampoInvalido] = useState<'email' | 'senha' | null>(null);

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
        <View style={styles.container}>
            <Image 
                source={require('../assets/logo_project.png.jpg')}
                style={styles.logo}
            /> 
            <Text style={styles.titulo}>ARTE SUAVE</Text>
            <Text style={styles.subtitulo}>ESTILO DE VIDA · QUIXADÁ</Text>
            <Text style={styles.secao}> ENTRAR </Text>
            <View style={styles.linhaSecao} />
            <Text style={styles.label}> E-MAIL </Text>
            <TextInput
                style={[styles.input, campoInvalido === 'email' && styles.inputInvalido]}
                placeholder="seu@email.com"
                placeholderTextColor="#929292"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <Text style={styles.label}> SENHA </Text>
            <TextInput
                style={[styles.input, campoInvalido === 'senha' && styles.inputInvalido]}
                placeholder="••••••••"
                maxLength={LIMITE_SENHA}
                placeholderTextColor="#929292"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
            />

            {erro ? <Text style={styles.erro}>{ erro }</Text> : null}
            {sessionMessage ? <Text accessibilityRole="alert" style={styles.mensagemSessao}>{sessionMessage}</Text> : null}
            <TouchableOpacity 
                onPress={handleLogin}
                style={[styles.botao, loading && styles.botaoDesativado]}
                disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.botaoTexto}>ACESSAR</Text>
            )}
            </TouchableOpacity>
            <BarraColorida/>
        </View>
    )
}
