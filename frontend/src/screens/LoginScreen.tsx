import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState} from 'react'
import { View, Alert, Text, Image, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { api } from '../services/api'
import type { RootStackParamList } from '../routes/types'
import { styles } from './LoginScreen.styles'
import { validarObrigatorio, emailValido, senhaValida } from '../utils/validators';

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

export default function LoginScreen({ navigation } : props) {

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [campoInvalido, setCampoInvalido] = useState<'email' | 'senha' | null>(null);

    async function handleLogin() {
        const emailLimpo = email.trim();
        const senhaLimpa = senha.trim();

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

        const erroSenha = senhaValida(senhaLimpa);
        if (erroSenha) {
            setErro(erroSenha);
            setCampoInvalido('senha');
            return;
        }

        setErro('');
        setLoading(true);
        try {
            await api.post('/auth/login', { email: emailLimpo, senha: senhaLimpa });
            navigation.replace('Home');
        } catch (e) {
            Alert.alert('Erro', 'E-mail ou senha inválidos');
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
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <Text style={styles.label}> SENHA </Text>
            <TextInput
                style={[styles.input, campoInvalido === 'senha' && styles.inputInvalido]}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
            />

            {erro ? <Text style={styles.erro}>{ erro }</Text> : null}
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