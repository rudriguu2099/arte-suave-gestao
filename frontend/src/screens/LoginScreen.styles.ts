import { StyleSheet } from "react-native"
import { colors } from "../components/ui"

const TAMANHO_LOGO = 150;

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.paper,
        paddingHorizontal: 24,
    },
    logo: {
        width: TAMANHO_LOGO,
        height: TAMANHO_LOGO,
        borderRadius: TAMANHO_LOGO / 2, 
    },
    secao: {
        color: colors.ink,
        alignSelf: 'flex-start',
        fontSize: 14,
        fontWeight: 700,
        marginTop: 32,
        marginBottom: 16,
    },
    label: {
        color: colors.muted,
        alignSelf: 'flex-start',
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 12,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderColor: colors.border,
        backgroundColor: colors.background,
        color: colors.ink,
        marginBottom: 16,
        fontSize: 14,
    },
    erro: {
        color: colors.error,
        alignSelf: 'center',
        marginBottom: 12,
    },
    botao: {
        width: '100%',
        borderRadius: 8,
        backgroundColor: colors.ink,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 32,
    },
    botaoDesativado: {
        opacity: 0.6,
    },
    botaoTexto: {
        color: colors.paper,
        fontSize: 14,
        fontWeight: 700
    },
    titulo: {
        color: colors.ink,
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 16,
    },
    subtitulo: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 1,
        marginTop: 4,
        marginBottom: 8,
    },
    barra: {
        flexDirection: 'row',
        width: '80%',
        height: 6,
    },
    linhaSecao: {
        backgroundColor: colors.ink,
        width: 60,
        height: 2,
        borderRadius: 2,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    inputInvalido: {
        borderColor: colors.error,
    },
    mensagemSessao: {
        color: colors.ink,
        marginBottom: 12,
    },
});