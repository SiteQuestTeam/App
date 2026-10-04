import { useMemo, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts as useManropeFonts, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { MapScreen } from './src/screens/MapScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { CreatorScreen } from './src/screens/CreatorScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { IncidentScreen } from './src/screens/IncidentScreen';
import { PermissionGateScreen } from './src/screens/PermissionGateScreen';
import { InitiativesScreen, ProfileScreen, RewardsScreen, SignInScreen } from './src/screens/TabScreens';
import { colors } from './src/theme';
import { initiatives as initialInitiatives } from './src/data';
import type { Initiative, PlayerState, ScreenName } from './src/types';

export default function App() {
  useManropeFonts({ Manrope_700Bold, Manrope_800ExtraBold });
  useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const [accessReady, setAccessReady] = useState(false);
  const [screen, setScreen] = useState<ScreenName>('signin');
  const [selectedId, setSelectedId] = useState('tea');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [incidentPhotoUri, setIncidentPhotoUri] = useState<string | undefined>();
  const [cameraTarget, setCameraTarget] = useState<'initiative' | 'incident'>('initiative');
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

  const navigateTo = (next: ScreenName) => {
    setScreen(next);
  };

  const openInitiative = (initiative: Initiative) => {
    setSelectedId(initiative.id);
    setScreen('detail');
  };

  const vote = (id: string) => {
    const target = initiatives.find((item) => item.id === id);
    const willPass = Boolean(target && target.status !== 'passed' && !target.hasVoted && target.votes + 1 >= target.threshold);
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
      pointsBalance: current.pointsBalance + 10 + (willPass ? 50 : 0),
      totalPointsEarned: current.totalPointsEarned + 10 + (willPass ? 50 : 0),
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
      case 'signin':
        return <SignInScreen nickname={player.nickname} onContinue={(nickname) => { setPlayer((p) => ({ ...p, nickname })); navigateTo('map'); }} />;
      case 'map':
        return (
          <MapScreen
            initiatives={initiatives}
            onCreate={() => setScreen('creator')}
            onCreateIncident={() => setScreen('incident')}
            onNavigate={navigateTo}
            onOpenInitiative={openInitiative}
            player={player}
          />
        );
      case 'initiatives':
        return <InitiativesScreen initiatives={initiatives} onNavigate={navigateTo} onOpenInitiative={openInitiative} />;
      case 'rewards':
        return <RewardsScreen onNavigate={navigateTo} player={player} onRedeem={(cost) => setPlayer((p) => ({ ...p, pointsBalance: Math.max(0, p.pointsBalance - cost) }))} />;
      case 'profile':
        return <ProfileScreen onNavigate={navigateTo} player={player} />;
      case 'detail':
        return <DetailScreen initiative={selected} onBack={() => navigateTo('map')} onVote={() => vote(selected.id)} />;
      case 'creator':
        return (
          <CreatorScreen
            photoUri={photoUri}
            onCamera={() => {
              setCameraTarget('initiative');
              setScreen('camera');
            }}
            onClose={() => navigateTo('map')}
            onPublish={publishInitiative}
          />
        );
      case 'incident':
        return (
          <IncidentScreen
            photoUri={incidentPhotoUri}
            onBack={() => {
              setIncidentPhotoUri(undefined);
              navigateTo('map');
            }}
            onCamera={() => {
              setCameraTarget('incident');
              setScreen('camera');
            }}
          />
        );
      case 'camera':
        return (
          <CameraScreen
            onBack={() => setScreen(cameraTarget === 'incident' ? 'incident' : 'creator')}
            onCapture={(uri) => {
              if (cameraTarget === 'incident') {
                setIncidentPhotoUri(uri);
                setScreen('incident');
              } else {
                setPhotoUri(uri);
                setScreen('creator');
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  if (!accessReady) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor={colors.background} barStyle="dark-content" />
        <SafeAreaView edges={['top', 'bottom']} style={styles.permissionSafeArea}>
          <PermissionGateScreen onReady={() => setAccessReady(true)} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
  permissionSafeArea: { backgroundColor: colors.background, flex: 1 },
});
