import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/hooks/useAuth';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import { useAuth } from './src/hooks/useAuth';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: '債主版' }} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: '記帳' }} />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: '群組' }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
