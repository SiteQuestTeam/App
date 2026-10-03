import { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts as useManropeFonts, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { MapScreen } from './src/screens/MapScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { CreatorScreen } from './src/screens/CreatorScreen';
import { DiscoverScreen, ProfileScreen, TeamScreen } from './src/screens/TabScreens';
import { CameraScreen } from './src/screens/CameraScreen';
import { colors } from './src/theme';
import type { Initiative, Role, ScreenName } from './src/types';

export default function App() {
  const [manropeLoaded] = useManropeFonts({ Manrope_700Bold, Manrope_800ExtraBold });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const [screen, setScreen] = useState<ScreenName>('map');
  const [role, setRole] = useState<Role>('player');
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  if (!manropeLoaded || !interLoaded) {
    return <View style={styles.loading}><ActivityIndicator color={colors.signal} size="large" /></View>;
  }

  const openInitiative = (initiative: Initiative) => {
    setSelectedInitiative(initiative);
    setScreen('detail');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'map':
        return <MapScreen onCreate={() => setScreen('creator')} onNavigate={setScreen} onOpenInitiative={openInitiative} onRoleChange={setRole} role={role} />;
      case 'discover':
        return <DiscoverScreen onNavigate={setScreen} onOpenInitiative={openInitiative} role={role} />;
      case 'team':
        return <TeamScreen onCreate={() => setScreen('creator')} onNavigate={setScreen} onOpenInitiative={openInitiative} role={role} />;
      case 'profile':
        return <ProfileScreen onCamera={() => setScreen('camera')} onNavigate={setScreen} onRoleChange={setRole} role={role} />;
      case 'detail':
        return selectedInitiative ? <DetailScreen initiative={selectedInitiative} onBack={() => setScreen('map')} role={role} /> : null;
      case 'creator':
        return <CreatorScreen onClose={() => setScreen('map')} onPublish={openInitiative} role={role} />;
      case 'camera':
        return <CameraScreen onBack={() => setScreen('profile')} />;
      default:
        return <MapScreen onCreate={() => setScreen('creator')} onNavigate={setScreen} onOpenInitiative={openInitiative} onRoleChange={setRole} role={role} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={screen === 'camera' ? colors.ink : colors.surface} barStyle={screen === 'camera' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={screen === 'camera' ? [] : ['top', 'bottom']} style={styles.safeArea}>
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
});
