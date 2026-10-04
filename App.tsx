import { useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts as useManropeFonts, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { MapScreen } from './src/screens/MapScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { CreatorScreen } from './src/screens/CreatorScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { InitiativesScreen, ProfileScreen, RewardsScreen } from './src/screens/TabScreens';
import { colors } from './src/theme';
import { initiatives as initialInitiatives } from './src/data';
import type { Initiative, PlayerState, ScreenName } from './src/types';

export default function App() {
  const [manropeLoaded] = useManropeFonts({ Manrope_700Bold, Manrope_800ExtraBold });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const [screen, setScreen] = useState<ScreenName>('map');
  const [selectedId, setSelectedId] = useState('tea');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [initiatives, setInitiatives] = useState<Initiative[]>(initialInitiatives);
  const [player, setPlayer] = useState<PlayerState>({
    nickname: 'Gracz Demo',
    pointsBalance: 860,
    totalPointsEarned: 1460,
    rank: 'Sąsiedzki Inicjator',
  });

  const selected = useMemo(
    () => initiatives.find((item) => item.id === selectedId) || initiatives[0],
    [initiatives, selectedId],
  );

  if (!manropeLoaded || !interLoaded) {
    return <View style={styles.loading}><ActivityIndicator color={colors.signal} size="large" /></View>;
  }

  const openInitiative = (initiative: Initiative) => {
    setSelectedId(initiative.id);
    setScreen('detail');
  };

  const vote = (id: string) => {
    setInitiatives((current) => current.map((item) => {
      if (item.id !== id || item.hasVoted || item.status === 'passed') return item;
      const votes = Math.min(item.threshold, item.votes + 1);
      return {
        ...item,
        votes,
        marker: votes >= item.threshold ? '✓' : String(votes),
        status: votes >= item.threshold ? 'passed' : 'collecting',
        hasVoted: true,
        color: votes >= item.threshold ? colors.resolved : item.color,
      };
    }));
    setPlayer((current) => ({
      ...current,
      pointsBalance: current.pointsBalance + 10,
      totalPointsEarned: current.totalPointsEarned + 10,
    }));
  };

  const publishInitiative = (initiative: Initiative) => {
    setInitiatives((current) => [initiative, ...current]);
    setSelectedId(initiative.id);
    setPlayer((current) => ({
      ...current,
      pointsBalance: current.pointsBalance + 100,
      totalPointsEarned: current.totalPointsEarned + 100,
    }));
    setPhotoUri(undefined);
    setScreen('detail');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'map':
        return <MapScreen initiatives={initiatives} onCreate={() => setScreen('creator')} onNavigate={setScreen} onOpenInitiative={openInitiative} player={player} />;
      case 'initiatives':
        return <InitiativesScreen initiatives={initiatives} onNavigate={setScreen} onOpenInitiative={openInitiative} />;
      case 'rewards':
        return <RewardsScreen onNavigate={setScreen} player={player} onRedeem={(cost) => setPlayer((p) => ({ ...p, pointsBalance: Math.max(0, p.pointsBalance - cost) }))} />;
      case 'profile':
        return <ProfileScreen onNavigate={setScreen} player={player} />;
      case 'detail':
        return <DetailScreen initiative={selected} onBack={() => setScreen('map')} onVote={() => vote(selected.id)} />;
      case 'creator':
        return <CreatorScreen photoUri={photoUri} onCamera={() => setScreen('camera')} onClose={() => setScreen('map')} onPublish={publishInitiative} />;
      case 'camera':
        return <CameraScreen onBack={() => setScreen('creator')} onCapture={(uri) => { setPhotoUri(uri); setScreen('creator'); }} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={screen === 'camera' ? '#000' : colors.surface} barStyle={screen === 'camera' ? 'light-content' : 'dark-content'} />
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
