import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Arte Suave Gestão</Text>
      <Text style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
        App inicializado com sucesso
      </Text>
    </View>
  );
}