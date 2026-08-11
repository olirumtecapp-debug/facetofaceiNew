# Diagnóstico Técnico: Regra de Perguntas de Gênero

A investigação revelou que a regra de desbloqueio das perguntas de gênero após 2 perguntas (disponível na 3ª) apresenta inconsistências nos dois modos de jogo.

### 1. Estado Atual por Modo

*   **VS IA:**
    *   A regra está implementada no `GameBoard.tsx` usando `gameState.myAskedQuestions.size < 2`.
    *   **O Problema:** O contador `myAskedQuestions` só é incrementado no `use-game-state.ts` (linha 248) quando uma resposta é recebida. No entanto, no modo IA, a transição para `PLAYER_DISCARDING` (que limpa a pergunta pendente) ocorre no mesmo `setGameState`.
    *   **Inconsistência Visual:** O `GameBoard.tsx` (linha 230) verifica o tamanho do Set. Se o Set tem 2 itens, o cadeado deve sumir. Porém, o incremento pode estar ocorrendo tarde demais para a renderização da lista de perguntas na rodada seguinte, ou o filtro `minTurn` no `QUESTIONS` (se existir) pode estar conflitando.

*   **ONLINE:**
    *   Utiliza o mesmo componente visual (`GameBoard.tsx`), portanto compartilha a lógica de `myAskedQuestions.size < 2`.
    *   **O Problema:** No modo online, o `myAskedQuestions` é atualizado via Realtime (linha 570) quando o adversário responde. Existe um atraso de rede e uma possível falha na sincronização do estado local que impede que a lista de perguntas seja "notificada" da mudança a tempo de liberar o gênero na 3ª tentativa.
    *   **Contador Individual:** O contador é individual (`myAskedQuestions` é um Set local no estado de cada jogador), o que é correto, mas a reatividade dele para habilitar botões está falhando.

### 2. Causas Identificadas

1.  **Dependência de Dados Estáticos:** O arquivo `src/data/questions.ts` não possui mais o campo `minTurn` (eu o removi na última iteração), mas o `GameBoard.tsx` ainda tenta aplicar uma lógica manual de `isLocked`.
2.  **Filtro Incompleto:** O componente `GameBoard.tsx` renderiza as perguntas filtradas por categoria. Quando a categoria "Gênero" é selecionada, as perguntas aparecem, mas o estado de `disabled` depende de `myAskedQuestions.size`. Se esse Set não for atualizado de forma atômica e previsível, o botão permanece bloqueado.
3.  **Terceira Pergunta:** A regra "A terceira pergunta JÁ deve ser de gênero" significa que após a 2ª resposta, o cadeado deve sumir. Se o jogador faz a Pergunta 1 e recebe resposta, `size` é 1. Se faz a Pergunta 2 e recebe resposta, `size` é 2. A condição `< 2` libera quando `size` chega a 2. Isso parece correto matematicamente, mas a experiência do usuário diz que não está funcionando.

### 3. Plano de Correção Mínima

1.  **use-game-state.ts:** Garantir que `myAskedQuestions` seja incrementado imediatamente ao receber qualquer resposta (SIM/NÃO), tanto no modo IA quanto no Online (via Realtime).
2.  **GameBoard.tsx:** Simplificar a lógica de bloqueio para ser 100% reativa ao estado do jogo e garantir que o componente de perguntas seja remontado ou atualizado quando o contador mudar.
3.  **Teste de Interface:** Adicionar um log visual (apenas para diagnóstico interno durante o desenvolvimento) para confirmar o valor de `myAskedQuestions.size` em tempo real.

### 4. O que NÃO será alterado
Nenhuma lógica de rede, Supabase, IA, personagens, cores ou layout será modificada. Apenas o gatilho booleano que habilita os botões de gênero.

**Encontrei a causa. Posso executar somente a correção necessária?**