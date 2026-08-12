# Plano de Implementação - Ajustes Finais Modo VS IA

Este plano descreve as correções pontuais solicitadas para o modo **VS IA**, garantindo a sincronia da trava de categoria "Gênero" para ambos os jogadores (Humano e IA) e o ajuste de texto no botão de encerramento do modo Single Player.

## 1. Regra de Pergunta de Gênero (Jogador e IA)

O objetivo é garantir que a categoria "Gênero" esteja bloqueada para **ambos** até que cada um chegue à sua 3ª pergunta individual.

### Backend/Lógica (IA)
- Modificar `src/lib/ai-logic.ts` para que a função `getBestAIQuestion` filtre perguntas da categoria "Gênero" se `aiAskedQuestions.size < 2`. Isso garante que a 3ª pergunta da IA (quando o tamanho do conjunto de perguntas feitas for 2) possa ser de gênero.

### Frontend (Jogador)
- Ajustar a lógica de `isLocked` em `src/components/GameBoard.tsx` para usar explicitamente `gameState.myAskedQuestions.size < 2` para a categoria "Gênero".

## 2. Texto do Botão no Modal de Fim de Partida (VS IA)

Alteração visual nos botões de encerramento exclusivamente para o modo Single Player.

### Alterações em `src/components/GameBoard.tsx`:
- Identificar o botão de encerramento do modo IA (Single Player).
- Se `gameState.winner === "PLAYER"`, o texto do botão será **"JOGAR NOVAMENTE"**.
- Se `gameState.winner === "AI"`, o texto do botão será **"REVANCHE"**.
- O botão "VOLTAR AO MENU" permanece inalterado.
- O modo ONLINE permanecerá 100% intocado em sua lógica de botões.

## Detalhes Técnicos

### Arquivos afetados:
- `src/lib/ai-logic.ts`: Adição da restrição de categoria para a IA.
- `src/components/GameBoard.tsx`: Ajuste da trava visual e label do botão de fim de jogo.

### Considerações de Segurança e Escopo:
- Nenhuma alteração em sockets, eventos de rede ou estrutura do banco de dados.
- Preservação total do fluxo Multiplayer.
- Correção de erro de SSR (`localStorage is not defined`) caso persista em novos componentes.
