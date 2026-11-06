import { View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { StudyDaysBanner } from '@/components/study-days-banner';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StudyDaysBanner />
      <AppTabs />
    </View>
  );
}
