import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDb } from '../db/migrations';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { fontAssets } from '../theme/fonts';

SplashScreen.preventAutoHideAsync(); // keep the splash up until the fonts are ready

function DbLoading() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;
  return (
    <Suspense fallback={<DbLoading />}>
      <SQLiteProvider databaseName="repnest.db" onInit={migrateDb} useSuspense>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </SQLiteProvider>
    </Suspense>
  );
}
