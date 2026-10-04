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
import { StartupStateScreen } from './src/screens/StartupStateScreen';
import { InitiativesScreen, ProfileScreen, RewardsScreen, SignInScreen } from './src/screens/TabScreens';
import { colors } from './src/theme';
import { initiatives as initialInitiatives } from './src/data';
import type { Initiative, PlayerState, ScreenName } from './src/types';

export default function App() {
  const [manropeLoaded] = useManropeFonts({ Manrope_700Bold, Manrope_800ExtraBold });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });
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

  if (!manropeLoaded || !interLoaded) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor={colors.surface} barStyle="dark-content" />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <StartupStateScreen
            title="Uruchamiamy SideQuest"
            body="Przygotowujemy aplikację i mapę. To potrwa tylko chwilę."
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
        return <SignInScreen nickname={player.nickname} onContinue={(nickname) => { setPlayer((p) => ({ ...p, nickname })); setScreen('map'); }} />;
      case 'map':
        return (
          <MapScreen
            initiatives={initiatives}
            onCreate={() => setScreen('creator')}
            onCreateIncident={() => setScreen('incident')}
            onNavigate={setScreen}
            onOpenInitiative={openInitiative}
            player={player}
          />
        );
      case 'initiatives':
        return <InitiativesScreen initiatives={initiatives} onNavigate={setScreen} onOpenInitiative={openInitiative} />;
      case 'rewards':
        return <RewardsScreen onNavigate={setScreen} player={player} onRedeem={(cost) => setPlayer((p) => ({ ...p, pointsBalance: Math.max(0, p.pointsBalance - cost) }))} />;
      case 'profile':
        return <ProfileScreen onNavigate={setScreen} player={player} />;
      case 'detail':
        return <DetailScreen initiative={selected} onBack={() => setScreen('map')} onVote={() => vote(selected.id)} />;
      case 'creator':
        return (
          <CreatorScreen
            photoUri={photoUri}
            onCamera={() => {
              setCameraTarget('initiative');
              setScreen('camera');
            }}
            onClose={() => setScreen('map')}
            onPublish={publishInitiative}
          />
        );
      case 'incident':
        return (
          <IncidentScreen
            photoUri={incidentPhotoUri}
            onBack={() => {
              setIncidentPhotoUri(undefined);
              setScreen('map');
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
});
