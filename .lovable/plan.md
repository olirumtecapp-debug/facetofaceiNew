# Plano: 48 recortes individuais dos personagens (24 vermelhos + 24 azuis)

Nada será alterado até você responder "APROVADO".

## A) Onde estão os assets atuais

- `src/assets/chars/` — 48 ponteiros `card-azul-1..24.png.asset.json` e `card-vermelho-1..24.png.asset.json` (imagens hospedadas no CDN).
- `src/assets/chars/index.ts` — exporta `CARD_IMAGES.AZUL[]` e `CARD_IMAGES.VERMELHO[]`, indexados por `character.id - 1`.
- `src/components/GameCard.tsx` — renderiza `CARD_IMAGES[color][id-1]` numa caixa `aspect-[178/224]` com `object-contain`.
- `src/components/GameBoard.tsx` — a grade do tabuleiro e a prévia de palpite.
- `src/data/characters.ts` — ordem oficial dos 24 nomes (id 1 = LIVIA … id 24 = THIAGO).

## B) Identificação das 48 imagens de referência

Fontes: `CardsAzulNovo-3.png` (1392×1130) e `CardsVermelhoNovo-3.png` (1391×1131). Ambas são RGB (o xadrez é desenhado, não é alpha real).

Cada folha tem 4 linhas × 6 colunas = 24 cards, na ordem de leitura esquerda→direita, cima→baixo, exatamente igual à lista oficial (LIVIA…THIAGO). A detecção não será por divisão fixa "chutada": vou detectar a máscara do xadrez (pixels cinza/branco alternados), gerar um mapa binário "card vs fundo", rotular componentes conexos e obter as 24 caixas delimitadoras reais. Depois ordeno por linha (y) e coluna (x). Se o número de componentes não for exatamente 24 em cada folha, eu paro e te aviso — não avanço no chute.

## C) Os 48 recortes individuais

Um recorte por card (`crop` na bounding box detectada), gerando 48 PNGs distintos em `/tmp`. Nenhum sprite-sheet, nenhum `background-position`, nenhum CSS mascarando corte.

## D) Remoção do fundo

Dentro de cada card recortado, removo:
1. o xadrez externo residual (fora do arredondamento da moldura);
2. a moldura dourada;
3. a placa de nome;
4. o fundo azul/vermelho sólido do card.

Método: o fundo do card é uma cor bastante uniforme (azul-marinho ou vinho, com leve vinheta). Faço uma segmentação por distância de cor no espaço LAB a partir de amostras do próprio card (cantos internos), com flood-fill a partir das bordas para não apagar pixels da mesma cor que estejam dentro do personagem (ex.: roupa azul do Lucas). Ou seja: só vira transparente o que estiver conectado à borda do card. A placa de nome e a moldura entram por máscara geométrica (faixa inferior + anel externo), também via flood-fill.

## E) Transparência real e bordas suaves

- Máscara em tons de cinza (não binária): distância de cor normalizada → alpha 0–255.
- Erosão de 1px do fundo + feather/blur gaussiano de ~0.8px na máscara para anti-aliasing.
- Descontaminação de borda ("decontaminate colors"): nos pixels de alpha parcial, removo a componente da cor de fundo do RGB, o que elimina halo azul/vermelho em cabelo, barba, óculos e fios soltos.
- Salvo em PNG RGBA (alpha real, sem matte branco/preto).
- `trim` final do alpha e recolocação numa tela de proporção uniforme, com o personagem centralizado — todos os 48 saem no mesmo canvas (mesma proporção), o que garante alinhamento na grade.

## F) Preservação exata dos personagens

Nenhuma IA generativa, nenhum redesenho, nenhum retoque, nenhum ajuste de cor/nitidez/iluminação. Só: recorte → alpha → suavização de borda. Os pixels internos do personagem permanecem bit a bit iguais ao original. THIAGO (posição 4×6 = última célula), NATHALIA (linha 1, coluna 6) e CAMILA (linha 2, coluna 6) vêm da mesma detecção automática — sem substituição manual, sem geração.

## G) A grade "4 linhas × 24 colunas"

Esclarecimento importante: as 4 linhas × 6 colunas existem **apenas nas folhas de referência**, como arranjo de impressão. Na interface, cada personagem é uma célula única; não há 4 estados/versões por personagem. A "estrutura lógica de 24 colunas" será respeitada como **ordem fixa dos 24 personagens (id 1..24)**, sempre na mesma sequência, nunca reordenada. As duas variantes existentes são apenas AZUL e VERMELHO (tabuleiro do jogador/adversário).

Ponto que preciso confirmar com você: com o fundo do card removido, **a moldura dourada e a placa com o nome deixam de existir na imagem**. O nome passa a ser renderizado pela interface abaixo do retrato, e a célula ganha um fundo/moldura via CSS coerente com a cor do tabuleiro. Se você preferir manter a moldura e a placa da arte original, me diga na aprovação — são caminhos diferentes.

## H) Responsividade

`GameBoard` usa CSS Grid com `repeat(auto-fit, minmax(...))`: 4 colunas em celular pequeno, 6 em celular grande/tablet, 8 em notebook, e até 12 em telas largas — sempre mantendo a ordem dos personagens. Cada célula tem `aspect-ratio` fixo e a imagem usa `object-contain` com `place-items:center`, então nada estica, achata ou corta. Espaçamento (`gap`) uniforme. Sem alteração de cores, estilo, menus ou lógica do jogo.

## I) Arquivos criados/modificados

Criados/substituídos:
- 48 ponteiros em `src/assets/chars/`: `card-azul-1..24.png.asset.json` e `card-vermelho-1..24.png.asset.json` (novos assets no CDN, PNG RGBA).

Modificados (mínimo necessário):
- `src/assets/chars/index.ts` — apenas se algum nome de arquivo mudar.
- `src/components/GameCard.tsx` — centralização/proporção e exibição do nome (já que a placa sai da arte).
- `src/components/GameBoard.tsx` — apenas as classes da grade e da prévia de palpite.
- `src/styles.css` — só se for preciso um token de moldura/fundo de célula.

Não serão tocados: regras, perguntas, IA, turnos, sons, navegação, menus, textos, nomes, pontuação.

## J) Validação final dos 48

1. Script de auditoria: para cada um dos 48 PNGs verifica dimensão, presença de canal alpha, percentual de pixels totalmente transparentes nas bordas, ausência de pixels de cor de fundo (azul-marinho/vinho) acima de um limiar, e centralização do bounding box do alpha.
2. Montagem de duas folhas de contato (24 vermelhos e 24 azuis sobre fundo neutro) que eu inspeciono visualmente, nome por nome, contra a referência — LIVIA, LUCAS, BERNARDO, CAIO, HELENA, NATHALIA, GAEL, ALICE, OTAVIO, ARTHUR, DAVI, CAMILA, BEATRIZ, SAMUEL, LARA, RAQUEL, YURI, VICENTE, HEITOR, MAYARA, ENZO, ISADORA, LORENA, THIAGO.
3. Verificação no navegador (desktop, tablet, celular) do tabuleiro renderizado: alinhamento, espaçamento, ausência de corte/deformação.
4. Se qualquer um dos 48 falhar, corrijo antes de entregar.

## K) Tabela de correspondência

| # | Personagem | Vermelho (origem) | Azul (origem) | Destino |
|---|---|---|---|---|
| 1 | LIVIA | L1C1 vermelho | L1C1 azul | card-vermelho-1 / card-azul-1 |
| 2 | LUCAS | L1C2 | L1C2 | card-vermelho-2 / card-azul-2 |
| 3 | BERNARDO | L1C3 | L1C3 | card-vermelho-3 / card-azul-3 |
| 4 | CAIO | L1C4 | L1C4 | card-vermelho-4 / card-azul-4 |
| 5 | HELENA | L1C5 | L1C5 | card-vermelho-5 / card-azul-5 |
| 6 | NATHALIA | L1C6 | L1C6 | card-vermelho-6 / card-azul-6 |
| 7 | GAEL | L2C1 | L2C1 | card-vermelho-7 / card-azul-7 |
| 8 | ALICE | L2C2 | L2C2 | card-vermelho-8 / card-azul-8 |
| 9 | OTAVIO | L2C3 | L2C3 | card-vermelho-9 / card-azul-9 |
| 10 | ARTHUR | L2C4 | L2C4 | card-vermelho-10 / card-azul-10 |
| 11 | DAVI | L2C5 | L2C5 | card-vermelho-11 / card-azul-11 |
| 12 | CAMILA | L2C6 | L2C6 | card-vermelho-12 / card-azul-12 |
| 13 | BEATRIZ | L3C1 | L3C1 | card-vermelho-13 / card-azul-13 |
| 14 | SAMUEL | L3C2 | L3C2 | card-vermelho-14 / card-azul-14 |
| 15 | LARA | L3C3 | L3C3 | card-vermelho-15 / card-azul-15 |
| 16 | RAQUEL | L3C4 | L3C4 | card-vermelho-16 / card-azul-16 |
| 17 | YURI | L3C5 | L3C5 | card-vermelho-17 / card-azul-17 |
| 18 | VICENTE | L3C6 | L3C6 | card-vermelho-18 / card-azul-18 |
| 19 | HEITOR | L4C1 | L4C1 | card-vermelho-19 / card-azul-19 |
| 20 | MAYARA | L4C2 | L4C2 | card-vermelho-20 / card-azul-20 |
| 21 | ENZO | L4C3 | L4C3 | card-vermelho-21 / card-azul-21 |
| 22 | ISADORA | L4C4 | L4C4 | card-vermelho-22 / card-azul-22 |
| 23 | LORENA | L4C5 | L4C5 | card-vermelho-23 / card-azul-23 |
| 24 | THIAGO | L4C6 | L4C6 | card-vermelho-24 / card-azul-24 |

Aguardo "APROVADO" para executar.
