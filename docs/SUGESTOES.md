# Sugestões e pontos em aberto

## Design: menos infantil, ainda gamificado

As referências do documento de funcionalidades tinham cara de jogo infantil (azul claro, ícones 3D, personagem cartoon). A proposta implementada:

- **Paleta:** preto quase puro (`#0A0A0A`), superfícies em cinza neutro e **um único laranja** (`#FF6A13`) reservado para ação e progresso.
- **Tipografia:** Inter para leitura; Barlow Condensed para números e títulos de impacto — linguagem de placar esportivo (Nike Training, Strava, Whoop).
- **Avatar sem personagem:** iniciais + cor de destaque, com **molduras, emblemas, títulos e banners** desbloqueáveis. Mantém a progressão e a personalização sem infantilizar, e evita produzir dezenas de ilustrações.
- **Ícones de traço fino** (Lucide), consistentes em todo o app.

## Sugestões para o produto

1. **Meta semanal em vez de só streak diária.** Streak diária pune o descanso e incentiva treinar lesionado. A tela Desafios já tem meta semanal ajustável; sugiro que ela vire a principal métrica de constância e que a streak diária conte o check-in de descanso (já implementado).
2. **Transparência da pontuação.** A tela de resultado mostra o bônus, a comparação e o histórico de cada exercício. Bom argumento para a banca (explicabilidade, seção 12 passo 16) e combate a sensação de "algoritmo injusto".
3. **Ranking por divisões em grupos grandes.** Em grupos públicos com muita gente, quem está no fim do ranking desanima (o próprio TCC cita esse risco). Sugestão: divisões de 20 pessoas com promoção/rebaixamento semanal, como no Duolingo.
4. **Desafios semanais rotativos** ("3 treinos de pernas", "10 km na semana") com recompensa em moedas — dão motivo para abrir o app sem depender do grupo.
5. **Notificações com moderação:** um lembrete no horário habitual de treino e um aviso de check-in aguardando voto. Nada além disso (fadiga de notificação também é citada no TCC).
6. **Foto + emoji + GPS é forte, mas tem atrito.** Deixar o GPS opcional por grupo (já implementado) e considerar "local do grupo" (academia cadastrada) para validar por proximidade no futuro.
7. **Apresentação na banca:** rode `npm run web` e projete o navegador em modo celular — o modo demo já vem com grupos, ranking e histórico.

## Definições técnicas que faltam nos documentos

| Tema | Situação | O que precisa ser decidido |
| --- | --- | --- |
| Base inicial de referência (C_inicial) | Tabela pronta, vazia | Fonte de dados com licença (ex.: estudos publicados de 1RM por peso/idade, datasets abertos de corrida). Sem isso, fica o neutro. |
| Modalidades além de musculação e corrida | Proposta provisória (velocidade média) | Modelo próprio para natação, ciclismo e caminhada, ou mantê-las só com a base de pontos. |
| Sexo para comparação | Feminino/Masculino | Como tratar pessoas que não se identificam com essas opções (ex.: comparar sem filtro de sexo). |
| Mínimo de registros históricos | 3 (proposta) | Validar por simulação, como o estudo indica. |
| Moedas, níveis, recompensas de descanso | Propostas implementadas | Confirmar valores de economia (preço dos itens × moedas por treino). |
| Regra de reprovação | Proposta implementada | Quórum mínimo e prazo de votação. |
| Faixa etária mínima | 13 anos no cadastro | Menores de 18 exigem consentimento dos responsáveis (LGPD art. 14). |
| Moderação de fotos | Não implementada | Denúncia de foto imprópria e remoção pelo dono do grupo. |
| Assinatura (citada no documento de funcionalidades) | Não implementada | Modelo de negócio e se entra no escopo do TCC. |
| Plataforma | Android (iOS e web funcionam) | Se o TCC vai citar apenas Android, os testes com usuários podem usar o APK gerado pelo EAS Build. |
