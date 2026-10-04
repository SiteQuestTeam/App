import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PrimaryButton, ScreenHeader, StatusChip } from '../components';
import { aiStep1, aiStep2 } from '../api';
import type { AiInitiativeBrief } from '../api';
import { colors, fonts } from '../theme';
import type { Fixer, Initiative } from '../types';

type AiQuestion = {
  topic: 'dzialanie' | 'zasoby';
  question: string;
  suggestions?: string[];
};

type AiAnswer = {
  temat: 'dzialanie' | 'zasoby';
  pytanie: string;
  odpowiedz: string;
};

export function CreatorScreen({ photoUri, onCamera, onClose, onPublish }) {
  const [step, setStep] = useState(photoUri ? 2 : 1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<AiAnswer[]>([]);
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [categoryHint, setCategoryHint] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [addressForAi, setAddressForAi] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [problem, setProblem] = useState('');
  const [proposedAction, setProposedAction] = useState('');
  const [whyImportant, setWhyImportant] = useState('');
  const [people, setPeople] = useState('');
  const [equipment, setEquipment] = useState('');
  const [transport, setTransport] = useState('');
  const [needsCity, setNeedsCity] = useState(true);
  const fixer: Fixer = needsCity ? 'Miasto' : 'Gracze';
  const [place, setPlace] = useState('');

  useEffect(() => {
    if (!photoUri) return;
    setStep(2);
    setQuestions([]);
    setAnswers([]);
    setQuestionIndex(0);
    void analyzePhoto();
  }, [photoUri]);

  const locate = async () => {
    let latitude = 50.06772;
    let longitude = 19.99215;
    let address = '';
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.granted) {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = current.coords.latitude;
        longitude = current.coords.longitude;
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          const item = places[0];
          if (item) {
            address = [item.street || item.name, item.streetNumber, item.city].filter(Boolean).join(' ');
          }
        } catch {}
      }
    } catch {}
    return { latitude, longitude, address };
  };

  const applyBrief = (brief: AiInitiativeBrief) => {
    setTitle(String(brief.title || '').slice(0, 60));
    setCategory(String(brief.category || ''));
    setProblem(String(brief.problem || ''));
    setProposedAction(String(brief.proposedAction || ''));
    setWhyImportant(String(brief.whyImportant || ''));
    setPeople(String(brief.resources?.people || ''));
    setEquipment(String(brief.resources?.equipment || ''));
    setTransport(String(brief.resources?.transport || ''));
    setNeedsCity(brief.fixer === 'Miasto');
    setStep(3);
  };

  const buildBrief = async (
    collectedAnswers: AiAnswer[],
    returnQuestionAsked = false,
    returnQuestionAnswer = '',
  ) => {
    if (!photoUri) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await aiStep2(photoUri, {
        kategoria: categoryHint,
        linia_gracza: '',
        odpowiedzi: collectedAnswers,
        pytanie_zwrotne_juz_zadane: returnQuestionAsked,
        odpowiedz_na_pytanie_zwrotne: returnQuestionAnswer,
        adres: addressForAi,
        dzielnica: '',
      });

      if (response?.brief_aplikacji) {
        applyBrief(response.brief_aplikacji);
        return;
      }

      const result = response?.wynik;
      if (result?.status === 'pytanie_zwrotne' && result.follow_up && !returnQuestionAsked) {
        const nextQuestion: AiQuestion = {
          topic: result.unclear_topic === 'zasoby' ? 'zasoby' : 'dzialanie',
          question: result.follow_up,
          suggestions: [],
        };
        setQuestions((current) => [...current, nextQuestion]);
        setQuestionIndex(questions.length);
        return;
      }

      throw new Error('AI nie przygotowało Briefu. Spróbuj ponownie.');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Nie udało się przygotować Briefu.');
    } finally {
      setAiLoading(false);
    }
  };

  const analyzePhoto = async () => {
    if (!photoUri) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const location = await locate();
      setAddressForAi(location.address);
      if (location.address) setPlace(location.address);

      const response = await aiStep1(photoUri, {
        linia_gracza: '',
        adres: location.address,
        dzielnica: '',
        zgloszenia_w_poblizu: [],
        ostatnie_briefy_gracza: [],
      });
      const result = response?.wynik;
      if (!result || result.status !== 'ok') {
        throw new Error(result?.message || result?.retake_reason || 'AI nie zaakceptowało zdjęcia.');
      }
      if (result.type !== 'inicjatywa') {
        throw new Error('To zdjęcie wygląda na Usterkę. Użyj ścieżki „Zgłoś usterkę”.');
      }

      setCategoryHint(result.category || null);
      const nextQuestions = Array.isArray(result.questions) ? result.questions.slice(0, 3) : [];
      setQuestions(nextQuestions);
      setQuestionIndex(0);
      if (nextQuestions.length === 0) {
        await buildBrief([]);
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Nie udało się przeanalizować zdjęcia.');
    } finally {
      setAiLoading(false);
    }
  };

  const answerQuestion = async () => {
    if (!answer.trim() || !questions[questionIndex]) return;
    const currentQuestion = questions[questionIndex];
    const nextAnswers = [
      ...answers,
      {
        temat: currentQuestion.topic,
        pytanie: currentQuestion.question,
        odpowiedz: answer.trim(),
      },
    ] as AiAnswer[];
    const currentAnswer = answer.trim();
    setAnswers(nextAnswers);
    setAnswer('');

    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    const isReturnQuestion = questions.length > 2 && questionIndex === questions.length - 1;
    await buildBrief(nextAnswers, isReturnQuestion, isReturnQuestion ? currentAnswer : '');
  };

  const publish = async () => {
    if (!title.trim() || !problem.trim() || !proposedAction.trim() || publishing) return;

    setPublishing(true);
    setAiError(null);
    try {
      const location = await locate();
      const initiative: Initiative = {
        id: `draft-${Date.now()}`,
        initiator: '',
        latitude: location.latitude,
        longitude: location.longitude,
        votes: 0,
        threshold: 10,
        status: 'collecting',
        shortTitle: title.slice(0, 60),
        marker: '0',
        color: colors.signal,
        distance: '0 m',
        brief: {
          title: title.slice(0, 60),
          category,
          problem,
          proposedAction,
          whyImportant,
          resources: { people, equipment, transport },
          fixer,
          place: place || location.address,
          photoUri,
        },
      };
      await onPublish(initiative);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Nie udało się opublikować Inicjatywy.');
    } finally {
      setPublishing(false);
    }
  };

  const briefReady = step === 3;
  const progress = step === 1 ? 'Zdjęcie' : step === 2 ? 'AI' : 'Brief';
  const currentQuestion = questions[questionIndex];

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
            <View style={styles.ruleCopy}><Text style={styles.ruleTitle}>Na miejscu</Text><Text style={styles.ruleBody}>Zdjęcie i GPS są podstawą Briefu i publikowanej pinezki.</Text></View>
          </View>
          <PrimaryButton icon="camera" onPress={onCamera} style={styles.next}>Zrób Zdjęcie na żywo</PrimaryButton>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}
          <StatusChip tone="violet" icon="sparkles">Bogdan · AI</StatusChip>
          <Text style={styles.title}>Doprecyzuj pomysł</Text>
          <Text style={styles.helper}>AI analizuje zdjęcie i może zadać maksymalnie 3 krótkie pytania przed utworzeniem Briefu.</Text>

          {aiLoading && !currentQuestion ? (
            <View style={styles.aiBubble}>
              <Text style={styles.aiLabel}>BOGDAN · AI</Text>
              <Text style={styles.aiText}>Analizuję zdjęcie i przygotowuję pytania…</Text>
            </View>
          ) : null}

          {currentQuestion ? (
            <>
              <View style={styles.chat}>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiLabel}>BOGDAN · AI</Text>
                  <Text style={styles.aiText}>{currentQuestion.question}</Text>
                </View>
                {answers.map((item, index) => (
                  <View key={`${item.pytanie}-${index}`} style={styles.userBubble}><Text style={styles.userText}>{item.odpowiedz}</Text></View>
                ))}
              </View>
              {currentQuestion.suggestions?.length ? (
                <Text style={styles.helperSmall}>Podpowiedzi: {currentQuestion.suggestions.join(' · ')}</Text>
              ) : null}
              <TextInput
                multiline
                onChangeText={setAnswer}
                placeholder="Napisz krótką odpowiedź…"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.answerInput]}
                value={answer}
              />
              <PrimaryButton disabled={!answer.trim() || aiLoading} icon="arrow-forward" onPress={() => void answerQuestion()} style={styles.next}>
                {aiLoading ? 'Tworzę Brief…' : questionIndex === questions.length - 1 ? 'Utwórz Brief' : 'Dalej'}
              </PrimaryButton>
            </>
          ) : null}

          {aiError ? (
            <View style={styles.publishNote}>
              <Ionicons color={colors.warning} name="alert-circle-outline" size={20} />
              <Text style={styles.publishNoteText}>{aiError}</Text>
            </View>
          ) : null}

          {aiError && !aiLoading ? (
            <PrimaryButton icon="refresh" onPress={() => void analyzePhoto()} style={styles.next}>Spróbuj ponownie</PrimaryButton>
          ) : null}
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
          <Text style={styles.helperSmall}>AI sugeruje wynik. Gracz może go potwierdzić albo zmienić przed publikacją.</Text>
          <DecisionRow
            label="Czy potrzebna jest zgoda, infrastruktura lub budżet Miasta?"
            value={needsCity}
            onChange={setNeedsCity}
          />
          <View style={styles.fixerResult}><Text style={styles.fixerResultLabel}>WYNIK</Text><Text style={styles.fixerResultValue}>{fixer}</Text></View>

          <Field label="Miejsce" value={place} onChangeText={setPlace} />
          {aiError ? <Text style={styles.helperSmall}>{aiError}</Text> : null}
          <PrimaryButton disabled={!title.trim() || !problem.trim() || !proposedAction.trim() || publishing} icon="send" onPress={() => void publish()} style={styles.next}>
            {publishing ? 'Publikuję…' : 'Opublikuj Inicjatywę'}
          </PrimaryButton>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function DecisionRow({ label, value, onChange }) {
  return <View style={styles.decisionCard}><Text style={styles.decisionLabel}>{label}</Text><View style={styles.decisionButtons}><Pressable onPress={() => onChange(true)} style={[styles.decisionButton, value && styles.decisionButtonActive]}><Text style={[styles.decisionText, value && styles.decisionTextActive]}>Tak</Text></Pressable><Pressable onPress={() => onChange(false)} style={[styles.decisionButton, !value && styles.decisionButtonActive]}><Text style={[styles.decisionText, !value && styles.decisionTextActive]}>Nie</Text></Pressable></View></View>;
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
  helperSmall: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 8 },
  ruleCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 24, padding: 16 },
  ruleCopy: { flex: 1 }, ruleTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 }, ruleBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
  next: { marginTop: 22 },
  photo: { borderRadius: 22, height: 220, marginBottom: 18, width: '100%' },
  photoSmall: { borderRadius: 18, height: 150, marginBottom: 16, width: '100%' },
  chat: { gap: 10, marginTop: 20 }, aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.violetSoft, borderRadius: 18, marginTop: 20, maxWidth: '88%', padding: 14 }, aiLabel: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.8 }, aiText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, marginTop: 5 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.signal, borderRadius: 18, maxWidth: '86%', padding: 13 }, userText: { color: colors.surface, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12 },
  answerInput: { marginTop: 18, minHeight: 92 },
  textArea: { minHeight: 96 },
  field: { marginTop: 17 }, label: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase' },
  sectionLabel: { color: colors.ink, fontFamily: fonts.heading, fontSize: 18, marginTop: 26 },
  decisionCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, marginTop: 12, padding: 14 }, decisionLabel: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 }, decisionButtons: { flexDirection: 'row', gap: 8, marginTop: 10 }, decisionButton: { alignItems: 'center', backgroundColor: colors.greySoft, borderRadius: 999, flex: 1, paddingVertical: 9 }, decisionButtonActive: { backgroundColor: colors.signal }, decisionText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 }, decisionTextActive: { color: colors.surface }, fixerResult: { alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, padding: 13 }, fixerResultLabel: { color: colors.violet, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1 }, fixerResultValue: { color: colors.ink, fontFamily: fonts.heading, fontSize: 16 },
  publishNote: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 16, flexDirection: 'row', gap: 10, marginTop: 20, padding: 14 }, publishNoteText: { color: colors.deep, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
});
