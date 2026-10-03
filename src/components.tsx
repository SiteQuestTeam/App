import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, shadow } from './theme';

export function Brand({ inverse = false, compact = false }) {
  const primary = inverse ? colors.surface : colors.signal;
  const accent = inverse ? '#A997FF' : colors.violet;

  return (
    <View style={styles.brand}>
      <View style={[styles.logo, compact && styles.logoCompact]} accessibilityLabel="Logo SiteQuest">
        <View style={[styles.logoHead, { backgroundColor: primary }]} />
        <View style={[styles.logoSide, styles.logoSideLeft, { backgroundColor: accent }]} />
        <View style={[styles.logoSide, styles.logoSideRight, { backgroundColor: accent }]} />
        <View style={[styles.logoBody, { backgroundColor: primary }]} />
        <View style={[styles.logoCenter, { backgroundColor: inverse ? colors.ink : colors.surface }]} />
      </View>
      {!compact && (
        <View>
          <Text style={[styles.brandName, inverse && styles.inverseText]}>SiteQuest</Text>
          <Text style={[styles.brandSub, inverse && styles.inverseMuted]}>wspólne działanie w mieście</Text>
        </View>
      )}
    </View>
  );
}

export function PrimaryButton({ children, icon, onPress, disabled = false, tone = 'blue', style }) {
  const backgroundColor = tone === 'violet' ? colors.violet : colors.signal;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon && <Ionicons color={colors.surface} name={icon} size={20} />}
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, inverse = false, style }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        inverse && styles.iconButtonInverse,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons color={inverse ? colors.surface : colors.ink} name={icon} size={21} />
    </Pressable>
  );
}

export function RoleSwitcher({ role, onChange, compact = false }) {
  return (
    <View style={[styles.roleSwitcher, compact && styles.roleSwitcherCompact]}>
      {[
        ['player', 'Gracz', 'person'],
        ['ngo', 'NGO', 'business'],
      ].map(([value, label, icon]) => {
        const active = role === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={value}
            onPress={() => onChange(value)}
            style={[styles.roleOption, active && styles.roleOptionActive]}
          >
            <Ionicons color={active ? colors.surface : colors.muted} name={icon} size={15} />
            <Text style={[styles.roleText, active && styles.roleTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScreenHeader({ kicker, title, onBack, right }) {
  return (
    <View style={styles.screenHeader}>
      {onBack && <IconButton icon="arrow-back" label="Wróć" onPress={onBack} />}
      <View style={styles.headerCopy}>
        {kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      </View>
      {right || <View style={styles.headerSpacer} />}
    </View>
  );
}

export function StatusChip({ children, tone = 'blue', icon }) {
  const palette = {
    blue: [colors.blueSoft, colors.deep],
    violet: [colors.violetSoft, colors.violet],
    green: [colors.mintSoft, '#147D59'],
    grey: [colors.greySoft, colors.greySpot],
    warning: ['#FFF5DF', colors.warning],
  }[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette[0] }]}>
      {icon && <Ionicons color={palette[1]} name={icon} size={14} />}
      <Text style={[styles.chipText, { color: palette[1] }]}>{children}</Text>
    </View>
  );
}

export function BottomNav({ active, onSelect, role }) {
  const items = role === 'ngo'
    ? [
        ['map', 'Mapa', 'map'],
        ['discover', 'Inicjatywy', 'compass'],
        ['team', 'Panel', 'analytics'],
        ['profile', 'Profil', 'person'],
      ]
    : [
        ['map', 'Mapa', 'map'],
        ['discover', 'Odkryj', 'compass'],
        ['team', 'Ekipa', 'people'],
        ['profile', 'Profil', 'person'],
      ];

  return (
    <View style={styles.bottomNav}>
      {items.map(([value, label, icon]) => {
        const selected = active === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={value}
            onPress={() => onSelect(value)}
            style={styles.navItem}
          >
            <Ionicons color={selected ? colors.signal : colors.muted} name={selected ? icon : `${icon}-outline`} size={22} />
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InitiativeRow({ item, onPress, joined = false }) {
  const tone = item.type === 'Rajd' ? 'violet' : item.type === 'Szare miejsce' ? 'grey' : 'blue';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.initiativeRow, pressed && styles.pressed]}>
      <View style={[styles.markerBadge, { backgroundColor: item.color }]}>
        <Text style={styles.markerLetter}>{item.marker}</Text>
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <StatusChip tone={tone}>{item.type}</StatusChip>
          <Text style={styles.distance}>{item.distance}</Text>
        </View>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>{item.date} · {item.people}/{item.capacity} osób</Text>
        {joined && <Text style={styles.joined}>✓ Jesteś w ekipie</Text>}
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  logo: { height: 56, position: 'relative', width: 68 },
  logoCompact: { height: 40, transform: [{ scale: 0.72 }], width: 49 },
  logoHead: { borderRadius: 8, height: 16, left: 26, position: 'absolute', top: 0, width: 16 },
  logoSide: { borderRadius: 7, height: 14, position: 'absolute', top: 15, width: 14 },
  logoSideLeft: { left: 7 },
  logoSideRight: { right: 7 },
  logoBody: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 1, height: 30, left: 9, position: 'absolute', width: 50 },
  logoCenter: { borderRadius: 6, bottom: 10, height: 12, left: 28, position: 'absolute', width: 12 },
  brandName: { color: colors.ink, fontFamily: fonts.headingExtra, fontSize: 26, letterSpacing: -0.8 },
  brandSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, marginTop: 1 },
  inverseText: { color: colors.surface },
  inverseMuted: { color: '#C9D1DF' },
  primaryButton: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 52, paddingHorizontal: 22 },
  primaryButtonText: { color: colors.surface, fontFamily: fonts.bodyBold, fontSize: 16 },
  disabled: { backgroundColor: '#E5E7EB', opacity: 0.7 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  iconButtonInverse: { backgroundColor: 'rgba(16,24,40,0.76)', borderColor: 'rgba(255,255,255,0.22)' },
  roleSwitcher: { backgroundColor: colors.greySoft, borderRadius: 14, flexDirection: 'row', padding: 4 },
  roleSwitcherCompact: { borderRadius: 12 },
  roleOption: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 38, paddingHorizontal: 14 },
  roleOptionActive: { backgroundColor: colors.ink },
  roleText: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 13 },
  roleTextActive: { color: colors.surface },
  screenHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 72, paddingHorizontal: 16, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  kicker: { color: colors.signal, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  headerTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 19, letterSpacing: -0.3, marginTop: 2 },
  headerSpacer: { width: 44 },
  chip: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 5, minHeight: 28, paddingHorizontal: 10 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.25, textTransform: 'uppercase' },
  bottomNav: { alignItems: 'center', backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 72, paddingBottom: 4, paddingHorizontal: 4 },
  navItem: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center', minHeight: 56 },
  navLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  navLabelActive: { color: colors.signal, fontFamily: fonts.bodyBold },
  initiativeRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 14, ...shadow },
  markerBadge: { alignItems: 'center', borderColor: colors.surface, borderRadius: 27, borderWidth: 4, height: 54, justifyContent: 'center', width: 54 },
  markerLetter: { color: colors.surface, fontFamily: fonts.headingExtra, fontSize: 18 },
  rowCopy: { flex: 1 },
  rowTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  distance: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12 },
  rowTitle: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17, lineHeight: 22, marginTop: 8 },
  rowMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 4 },
  joined: { color: '#147D59', fontFamily: fonts.bodyBold, fontSize: 11, marginTop: 5 },
});
