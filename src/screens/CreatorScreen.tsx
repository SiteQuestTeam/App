import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { mockAiQuestions } from '../data';
import { colors, fonts } from '../theme';
import type { Fixer, Initiative } from '../types';

export function CreatorScreen({ photoUri, onCamera, onClose, onPublish }) {
  const [step, setStep] = useState(photoUri ? 2 : 1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [title, setTitle] = useState('Więcej zieleni i miejsca do odpoczynku');
  const [category, setCategory] = useState('Zieleń');
  const [problem, setProblem] = useState('W tym miejscu brakuje zieleni i wygodnego miejsca, gdzie można na chwilę usiąść.');
  const [proposedAction, setProposedAction] = useState('Dodać niewielką strefę zieleni z ławką i roślinami odpornymi na warunki miejskie.');
  const [whyImportant, setWhyImportant] = useState('Poprawi komfort mieszkańców i jakość wspólnej przestrzeni.');
  const [people, setPeople] = useState('2–3 osoby do przygotowania miejsca');
  const [equipment, setEquipment] = useState('ławka, donice, rośliny, podstawowe narzędzia');
  const [transport, setTransport] = useState('transport ławki i roślin');
  const [fixer, setFixer] = useState<Fixer>('Miasto');
  const [place, setPlace] = useState('Okolice TAURON Areny, Kraków');

  useEffect(() => {
    if (photoUri) setStep(2);
  }, [photoUri]);

  const aiDone = questionIndex >= mockAiQuestions.length;
  const briefReady = step === 3;
  const progress = step === 1 ? 'Zdjęcie' : step === 2 ? 'AI' : 'Brief';

  const answerQuestion = () => {
    if (!answer.trim()) return;
    setAnswers((current) => [...current, answer.trim()]);
    setAnswer('');
    if (questionIndex + 1 >= mockAiQuestions.length) {
      setQuestionIndex(mockAiQuestions.length);
      setStep(3);
    } else {
      setQuestionIndex((current) => current + 1);
    }
  };

  const publish = () => {
    const initiative: Initiative = {
      id: `initiative-${Date.now()}`,
      initiator: 'Gracz Demo',
      latitude: 50.06772,
      longitude: 19.99215,
      votes: 0,
      threshold: 10,
      status: 'collecting',
      shortTitle: title,
      marker: '0',
      color: colors.signal,
      distance: '40 m',
      brief: {
        title: title.slice(0, 60),
        category,
        problem,
        proposedAction,
        whyImportant,
        resources: { people, equipment, transport },
        fixer,
        place,
        photoUri,
      },
    };
    onPublish(initiative);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScreenHeader kicker={progress} onBack={step === 1 ? onClose : () => setStep(Math.max(1, step - 1))} title="Nowa Inicjatywa" />
      <View style={styles.progressRow}>{[1, 2, 3].map((n) => <View key={n} style={[styles.progressPart, n <= step && styles.progressPartActive]} />)}</View>

      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroIcon}><Ionicons color={colors.surface} name="camera" size={28} /></View>
          <Text style={styles.title}>Najpierw Zdjęcie na żywo</Text>
          <Text style={styles.helper}>Zdjęcie musi być wykonane aparatem w aplikacji. W MVP nie używamy galerii.</Text>
          <View style={styles.ruleCard}>
            <Ionicons color={colors.signal} name="location" size={22} />
            <View style={styles.ruleCopy}><Text style={styles.ruleTitle}>Na miejscu</Text><Text style={styles.ruleBody}>Zgłoszenie jest przeznaczone do użycia w pobliżu inicjatywy — docelowo serwer sprawdza promień około 50 m.</Text></View>
          </View>
          <PrimaryButton icon="camera" onPress={onCamera} style={styles.next}>Zrób Zdjęcie na żywo</PrimaryButton>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}
          <StatusChip tone="violet" icon="sparkles">Mock AI</StatusChip>
          <Text style={styles.title}>Doprecyzuj pomysł</Text>
          <Text style={styles.helper}>AI może zadać maksymalnie 3 pytania. Na tym etapie odpowiedzi są lokalnym mockiem.</Text>

          <View style={styles.chat}>
            <View style={styles.aiBubble}>
              <Text style={styles.aiLabel}>BOGDAN · AI</Text>
              <Text style={styles.aiText}>{mockAiQuestions[Math.min(questionIndex, mockAiQuestions.length - 1)]}</Text>
            </View>
            {answers.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.userBubble}><Text style={styles.userText}>{item}</Text></View>
            ))}
          </View>

          {!aiDone && (
            <>
              <TextInput
                multiline
                onChangeText={setAnswer}
                placeholder="Napisz krótką odpowiedź…"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.answerInput]}
                value={answer}
              />
              <PrimaryButton disabled={!answer.trim()} icon="arrow-forward" onPress={answerQuestion} style={styles.next}>
                {questionIndex === mockAiQuestions.length - 1 ? 'Utwórz Brief' : 'Dalej'}
              </PrimaryButton>
            </>
          )}
        </ScrollView>
      )}

      {briefReady && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoSmall} /> : null}
          <StatusChip tone="green" icon="checkmark-circle">Brief gotowy do akceptacji</StatusChip>
          <Text style={styles.title}>Sprawdź Brief</Text>
          <Text style={styles.helper}>AI przygotowało szkic. Gracz zawsze może go poprawić przed publikacją.</Text>

          <Field label="Tytuł · max 60 znaków" value={title} onChangeText={(v) => setTitle(v.slice(0, 60))} />
          <Field label="Kategoria" value={category} onChangeText={setCategory} />
          <Field label="Problem" multiline value={problem} onChangeText={setProblem} />
          <Field label="Proponowane działanie" multiline value={proposedAction} onChangeText={setProposedAction} />
          <Field label="Dlaczego to ważne" multiline value={whyImportant} onChangeText={setWhyImportant} />
          <Text style={styles.sectionLabel}>Potrzebne zasoby</Text>
          <Field label="Ludzie" value={people} onChangeText={setPeople} />
          <Field label="Sprzęt" value={equipment} onChangeText={setEquipment} />
          <Field label="Transport" value={transport} onChangeText={setTransport} />

          <Text style={styles.sectionLabel}>Kto naprawi?</Text>
          <Text style={styles.helperSmall}>AI sugeruje wykonawcę, ale decyzję potwierdza Gracz.</Text>
          <View style={styles.fixerRow}>
            {(['Miasto', 'Gildia', 'Gracze'] as Fixer[]).map((value) => (
              <Pressable key={value} onPress={() => setFixer(value)} style={[styles.fixer, fixer === value && styles.fixerActive]}>
                <Text style={[styles.fixerText, fixer === value && styles.fixerTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Miejsce" value={place} onChangeText={setPlace} />
          <View style={styles.publishNote}><Ionicons color={colors.signal} name="star" size={20} /><Text style={styles.publishNoteText}>Mock MVP: publikacja doda pinezkę lokalnie i przyzna +100 Punktów.</Text></View>
          <PrimaryButton disabled={!title.trim() || !problem.trim() || !proposedAction.trim()} icon="send" onPress={publish} style={styles.next}>Opublikuj Inicjatywę</PrimaryButton>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Field({ label, multiline = false, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.textArea]} textAlignVertical={multiline ? 'top' : 'center'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  progressRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingTop: 12 },
  progressPart: { backgroundColor: colors.border, borderRadius: 99, flex: 1, height: 5 },
  progressPartActive: { backgroundColor: colors.signal },
  content: { padding: 18, paddingBottom: 42 },
  heroIcon: { alignItems: 'center', backgroundColor: colors.signal, borderRadius: 28, height: 56, justifyContent: 'center', marginTop: 10, width: 56 },
  title: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 27, letterSpacing: -0.7, marginTop: 14 },
  helper: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 7 },
  helperSmall: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 5 },
  ruleCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 24, padding: 16 },
  ruleCopy: { flex: 1 }, ruleTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 }, ruleBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
  next: { marginTop: 22 },
  photo: { borderRadius: 22, height: 220, marginBottom: 18, width: '100%' },
  photoSmall: { borderRadius: 18, height: 150, marginBottom: 16, width: '100%' },
  chat: { gap: 10, marginTop: 20 }, aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.violetSoft, borderRadius: 18, maxWidth: '88%', padding: 14 }, aiLabel: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.8 }, aiText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, marginTop: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.signal, borderRadius: 18, maxWidth: '86%', padding: 13 }, userText: { color: colors.surface, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12 },
  answerInput: { marginTop: 18, minHeight: 92 },
  textArea: { minHeight: 96 },
  field: { marginTop: 17 }, label: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase' },
  sectionLabel: { color: colors.ink, fontFamily: fonts.heading, fontSize: 18, marginTop: 26 },
  fixerRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, fixer: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, flex: 1, paddingVertical: 11 }, fixerActive: { backgroundColor: colors.signal, borderColor: colors.signal }, fixerText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 }, fixerTextActive: { color: colors.surface },
  publishNote: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 16, flexDirection: 'row', gap: 10, marginTop: 20, padding: 14 }, publishNoteText: { color: colors.deep, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
});
