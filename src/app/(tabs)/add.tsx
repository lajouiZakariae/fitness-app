import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme/colors';

export default function AddActionScreen() {
  return <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Close menu" /><View style={styles.sheet}><Text style={styles.title}>Create something</Text><Text style={styles.subtitle}>Choose what you want to add.</Text><Button title="Add exercise" onPress={() => router.push('/exercise/new')} /><Button title="Add workout" variant="secondary" onPress={() => router.push('/workout/new')} /><Button title="Cancel" variant="quiet" onPress={() => router.back()} /></View></View>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: colors.overlayStrong, justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md }, title: { color: colors.textPrimary, fontSize: typography.heading, fontWeight: '800' }, subtitle: { color: colors.textSecondary, marginBottom: spacing.sm } });
