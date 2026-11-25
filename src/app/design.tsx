import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Ring } from '../components/ui/Ring';
import { Screen } from '../components/ui/Screen';
import { colors } from '../theme';

const GOAL = 3;

export default function DesignPreviewScreen() {
  const [done, setDone] = useState(2);

  return (
    <Screen scroll title="Design preview" edges={['top', 'bottom']}>
      <Card variant="hero" style={{ alignItems: 'center' }}>
        <Ring size={200} strokeWidth={18} progress={done / GOAL}>
          <AppText variant="display">{done}</AppText>
          <AppText variant="caption" tone="muted">
            of {GOAL} this week
          </AppText>
        </Ring>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label="-1"
            size="md"
            variant="secondary"
            onPress={() => setDone((n) => Math.max(0, n - 1))}
          />
          <Button label="+1" size="md" onPress={() => setDone((n) => Math.min(GOAL, n + 1))} />
        </View>
      </Card>

      <Card>
        <AppText variant="label" tone="primary">
          UP NEXT
        </AppText>
        <AppText variant="hero">Starter A</AppText>
        <AppText tone="muted">3 exercises · about 6 min</AppText>
      </Card>

      <Card variant="quiet">
        <AppText variant="heading">Quiet card</AppText>
        <AppText variant="caption" tone="muted">
          For secondary information.
        </AppText>
      </Card>

      <Button label="Start today's workout" icon="play" onPress={() => {}} />
      <Button label="Short on time? 5-min version" variant="secondary" onPress={() => {}} />
      <Button label="Skip for now" variant="quiet" onPress={() => {}} />
      <Button label="Disabled" disabled onPress={() => {}} />

      <AppText variant="label" tone="faint">
        TYPE SCALE
      </AppText>
      <AppText variant="display">64</AppText>
      <AppText variant="hero">Hero 40</AppText>
      <AppText variant="title">Title 28</AppText>
      <AppText variant="heading">Heading 20</AppText>
      <AppText variant="bodyStrong">Body strong 16</AppText>
      <AppText>Body 16, the system font.</AppText>
      <AppText variant="caption" tone="muted" style={{ color: colors.textMuted }}>
        Caption 13
      </AppText>
    </Screen>
  );
}
