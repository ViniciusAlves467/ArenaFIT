import { bonusFromScore, DEFAULT_PARAMS, rewardsFromBonus } from '@shared/scoring/index.ts';
import { StyleSheet, View } from 'react-native';

import { Card, Divider, Icon, type IconName, Screen, SectionTitle, Text, TopBar } from '@/components/ui';
import { formatNumber, formatPercent } from '@/theme/format';
import { colors, radius, space } from '@/theme/tokens';

function Point({ icon, title, children }: { icon: IconName; title: string; children: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="secondary">
          {children}
        </Text>
      </View>
    </View>
  );
}

/** Explicação da regra de pontuação (Estudo de Cálculo de Pontuação do TCC) para o usuário. */
export default function Scoring() {
  const table = [0, 0.25, 0.5, 0.75, 1].map((S) => {
    const B = bonusFromScore(S, DEFAULT_PARAMS);
    return { S, B, ...rewardsFromBonus(B, DEFAULT_PARAMS) };
  });

  return (
    <Screen>
      <TopBar title="Como pontuamos" />
      <Text variant="body" tone="secondary">
        A regra foi desenhada para premiar quem aparece, não só quem é mais forte. Seus dados corporais nunca dão pontos — servem apenas para comparar você com pessoas parecidas.
      </Text>

      <SectionTitle title="A base" />
      <Card style={{ gap: space.lg }}>
        <Point icon="check" title="Todo treino válido vale 50 pontos e 1.000 XP">
          É a recompensa pela constância — a maior parte da sua pontuação.
        </Point>
        <Point icon="trending-up" title="Bônus de desempenho: de 5% a 20%">
          Nunca menos que 5%, nunca mais que 20%. Ninguém dispara no ranking só por levantar mais.
        </Point>
        <Point icon="calendar" title="Um treino pontuado por dia em cada grupo">
          Treinos extras rendem XP, mas não inflam o ranking do grupo.
        </Point>
      </Card>

      <SectionTitle title="Score → recompensa" />
      <Card padded={false}>
        <View style={styles.row}>
          {['Score', 'Bônus', 'Pontos', 'XP'].map((h) => (
            <Text key={h} variant="overline" tone="muted" style={styles.cell}>
              {h}
            </Text>
          ))}
        </View>
        {table.map((r) => (
          <View key={r.S}>
            <Divider />
            <View style={styles.row}>
              <Text variant="bodyStrong" style={styles.cell}>
                {formatPercent(r.S, 0)}
              </Text>
              <Text variant="body" tone="primary" style={styles.cell}>
                {formatPercent(r.B, 2)}
              </Text>
              <Text variant="body" style={styles.cell}>
                {r.points}
              </Text>
              <Text variant="body" style={styles.cell}>
                {formatNumber(r.xp)}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle title="De onde vem o score" />
      <Card style={{ gap: space.lg }}>
        <Point icon="users" title="Comparação com pessoas parecidas">
          Seu resultado é posicionado entre pessoas do mesmo sexo e com altura, peso e idade próximas — quanto mais parecida, mais ela pesa.
        </Point>
        <Point icon="activity" title="Sua própria evolução (após 3 semanas)">
          Depois do período inicial, 65% do score vem do seu histórico das últimas 6 semanas e 35% da comparação. Evoluir vale mais do que já ser forte.
        </Point>
        <Point icon="dumbbell" title="Musculação">
          Cada exercício usa o melhor 1RM estimado (carga × (1 + reps/30)). Exercícios do mesmo músculo usam a mediana — mais exercícios não dão vantagem.
        </Point>
        <Point icon="run" title="Corrida">
          Distâncias diferentes são convertidas num tempo equivalente de 5 km, para que 5 e 10 km sejam comparáveis.
        </Point>
        <Point icon="shield" title="Começo justo">
          Enquanto o app tem poucos usuários, a comparação parte de uma posição neutra e migra gradualmente para os dados reais.
        </Point>
        <Point icon="thumbs-down" title="Validação pelos colegas">
          Check-ins reprovados pela maioria do grupo perdem os pontos e deixam de contar nas estatísticas.
        </Point>
      </Card>

      <Text variant="caption" tone="muted" align="center" style={{ marginTop: space.xl }}>
        Modelo de gamificação — não é avaliação médica ou física.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', gap: space.md },
  pointIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', paddingVertical: space.md, paddingHorizontal: space.lg },
  cell: { flex: 1 },
});
