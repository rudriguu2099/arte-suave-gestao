import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminFooter, NotificationCards } from "../components/access";
import { Back, HeaderBand, Heading, Page } from "../components/ui";
import type { RootStackParamList } from "../features/access/types";

export default function NotificationsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Notifications">) {
  return (
    <Page footer={<AdminFooter navigation={navigation} active="Home" />}>
      <HeaderBand>
        <Back onPress={navigation.goBack} />
        <Heading title="NOTIFICAÇÕES" />
      </HeaderBand>

      <NotificationCards />
    </Page>
  );
}