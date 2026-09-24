import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import AccountsScreen from "../screens/AccountsScreen";
import AccountFormScreen from "../screens/AccountFormScreen";
import PasswordScreen from "../screens/PasswordScreen";
import { EventsScreen, FinanceScreen, GroupsScreen, StudentsScreen, AttendanceScreen } from "../screens/ReferenceScreens";
import { useAccess } from "../features/access/AccessContext";
import { isStaff, isSuperAdmin } from "../features/access/domain";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
export default function Routes() {
  const { current } = useAccess();
  return <NavigationContainer>
    <Stack.Navigator key={current ? current.id + "-" + current.role + "-" + current.isSuperAdmin : "guest"}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F3F3F3" } }}>
      {!current ? <Stack.Screen name="Login" component={LoginScreen} /> : <>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Password" component={PasswordScreen} />
        {isStaff(current) && <>
          <Stack.Screen name="Accounts" component={AccountsScreen} />
          <Stack.Screen name="AccountForm" component={AccountFormScreen} />
          <Stack.Screen name="Groups" component={GroupsScreen} />
          <Stack.Screen name="Students" component={StudentsScreen} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
        </>}
        {isSuperAdmin(current) && <>
          <Stack.Screen name="Finance" component={FinanceScreen} />
          <Stack.Screen name="Events" component={EventsScreen} />
        </>}
      </>}
    </Stack.Navigator>
  </NavigationContainer>;
}
