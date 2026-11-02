import { View } from 'react-native';

import type { LegalDoc } from '@/content/legal';
import { space } from '@/theme/tokens';

import { Card, Screen, Text, TopBar } from './ui';

export function LegalScreen({ doc }: { doc: LegalDoc }) {
  return (
    <Screen>
      <TopBar title={doc.title} />
      <Text variant="caption" tone="muted">
        Atualizado em {doc.updatedAt} · versão {doc.version}
      </Text>
      <Text variant="body" tone="secondary" style={{ marginTop: space.md, marginBottom: space.lg }}>
        {doc.intro}
      </Text>
      <View style={{ gap: space.md }}>
        {doc.sections.map((s) => (
          <Card key={s.title} style={{ gap: space.sm }}>
            <Text variant="heading">{s.title}</Text>
            {s.paragraphs.map((p) => (
              <Text key={p} variant="body" tone="secondary">
                {p}
              </Text>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
