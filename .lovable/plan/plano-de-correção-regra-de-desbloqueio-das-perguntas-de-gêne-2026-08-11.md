# Plano de Correção: Regra de Desbloqueio das Perguntas de Gênero

Este plano visa corrigir a regra de exibição das perguntas de gênero ("É homem?", "É mulher?") para que sejam liberadas individualmente para cada jogador após este realizar exatamente **2 perguntas**. A 3ª pergunta já poderá ser de gênero.

## Diagnóstico
O sistema atual utiliza `turnCount` do estado global da partida, o que não reflete o número de perguntas individuais feitas por cada jogador, especialmente no modo Online. Além disso, a lógica de bloqueio visual no componente não está alinhada com a contagem individual.

## Alterações Propostas

### 1. Rastreamento Individual de Perguntas
- **Arquivo:** `src/hooks/use-game-state.ts`
- **Ação:** Utilizar o tamanho do conjunto `myAskedQuestions` (que já existe e armazena as perguntas feitas pelo jogador local) como o contador oficial para o desbloqueio.
- **Lógica:** O contador será `gameState.myAskedQuestions.size`.

### 2. Atualização da Interface (Cadeado e Bloqueio)
- **Arquivo:** `src/components/GameBoard.tsx`
- **Ação:** Alterar a lógica de `isLocked` para as perguntas.
- **Nova Regra:** Se a pergunta for da categoria "Gênero", ela estará bloqueada (`isLocked = true`) se `gameState.myAskedQuestions.size < 2`.
- **Efeito:**
    - 0 perguntas feitas -> `size = 0` (Bloqueado)
    - 1 pergunta feita -> `size = 1` (Bloqueado)
    - 2 perguntas feitas -> `size = 2` (Liberado para a 3ª pergunta)

### 3. Remoção de Restrições Globais
- **Arquivo:** `src/data/questions.ts`
- **Ação:** Remover o campo `minTurn: 3` das perguntas de gênero, pois a regra será controlada dinamicamente pelo componente com base no histórico individual do jogador.

## Respostas às Perguntas do Usuário

1. **Qual contador de perguntas já existe no projeto?**
   Já existe o `myAskedQuestions` (um `Set<string>`) dentro do `useGameState`, que registra os IDs das perguntas que o jogador local já enviou.
2. **Esse contador é individual para cada jogador?**
   Sim, `myAskedQuestions` é preenchido apenas quando o jogador local chama `handlePlayerQuestion`. No modo online, o adversário tem seu próprio estado local com seu próprio `myAskedQuestions`.
3. **Como você vai identificar a terceira pergunta?**
   Verificando se `myAskedQuestions.size === 2`. Se o tamanho for 2, significa que 2 perguntas já foram feitas, então a próxima (a 3ª) pode ser de gênero.
4. **Como evitar que o contador do adversário seja utilizado?**
   Utilizando exclusivamente `myAskedQuestions` em vez de `turnCount` ou `askedQuestions` (que em alguns modos pode ser global).
5. **Como garantir que a terceira pergunta já possa ser de gênero?**
   Ao usar a condição `size < 2` para bloquear, assim que a 2ª pergunta é processada e adicionada ao Set, o `size` torna-se 2, o que avalia `2 < 2` como `false`, liberando os botões imediatamente para a escolha da 3ª pergunta.
6. **Como manter o cadeado somente nas duas primeiras perguntas?**
   O componente `GameBoard.tsx` continuará renderizando o ícone `🔒` enquanto a condição `isLocked` for verdadeira.
7. **Quais arquivos/componentes serão alterados?**
   - `src/data/questions.ts` (Remover `minTurn`)
   - `src/components/GameBoard.tsx` (Nova lógica de `isLocked`)

**Posso executar essa correção?**
