import { Text, View } from "react-native";
import { Action, Heading, Page, Section, styles } from "../components/ui";
import { useAccess } from "../features/access/AccessContext";
import { roleLabels } from "../features/access/types";

export default function DemoScreen() {
  const { demoMode, demoProfiles, selectDemoAccount } = useAccess();
  return (
    <Page>
      <View style={{ marginTop: 48, gap: 28 }}>
        <Heading title="ARTE SUAVE" subtitle="Gestão de perfis de acesso" />
        <Section
          title={demoMode ? "Ambiente de demonstração" : "Integração de acesso"}
        >
          <Text style={styles.text}>
            {demoMode
              ? "Escolha um perfil para conferir as telas."
              : "Conecte a sessão autenticada para acessar o aplicativo."}
          </Text>
          <Text style={styles.muted}>
            {demoMode
              ? "Dados fictícios e alterações temporárias. Esta seleção não é uma tela de login. Senhas não são salvas nem usadas para autenticar."
              : "A tela de login e os serviços de autenticação serão integrados pela equipe."}
          </Text>
        </Section>
        {demoMode && (
          <View style={{ gap: 12 }}>
            {demoProfiles.map((profile) => (
              <Action
                key={profile.id}
                title={`${profile.isSuperAdmin ? "Superadmin" : roleLabels[profile.role]} · ${profile.name}`}
                onPress={() => selectDemoAccount(profile.id)}
              />
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}
