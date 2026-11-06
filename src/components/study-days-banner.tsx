import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { progressRepository } from '@/db/client';
import { studyDaysText } from '@/db/local-day';
import { useTheme } from '@/hooks/use-theme';

export function StudyDaysBanner() {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const [days, setDays] = useState(0);
  useFocusEffect(
    useCallback(() => {
      progressRepository.countStudyDays().then(setDays);
    }, []),
  );
  const [n, ...rest] = studyDaysText(days).split(' ');
  return (
    <View style={[styles.bar, { backgroundColor: theme.primary, paddingTop: top + Spacing.one }]}>
      <Text accessible accessibilityLabel={studyDaysText(days)} style={{ color: theme.onPrimary, fontSize: 13 }}>
        <Text style={{ color: theme.accent, fontWeight: '700' }}>{n}</Text> {rest.join(' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ bar: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one } });
