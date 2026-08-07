import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";

export type Difficulty = "Fácil" | "Médio" | "Difícil";

export const getAIResponse = (character: Character, question: Question): boolean => {
  return question.check(character);
};

export const getBestAIQuestion = (
  difficulty: Difficulty,
  remainingCharacters: Character[],
  turn: number,
  aiAskedQuestions: Set<string> = new Set(),
  aiKnowledge: { [id: string]: boolean } = {}
): Question => {
  const availableQuestions = QUESTIONS.filter((q) => {
    // 1. Nunca repetir uma pergunta já feita pela IA
    if (aiAskedQuestions.has(q.id)) return false;

    // 2. Não perguntar o que já é conhecido
    if (aiKnowledge[q.id] !== undefined) return false;

    // 3. Eliminar perguntas redundantes baseadas em conhecimento prévio
    
    // Se sabemos que NÃO usa óculos, não perguntar sobre tipos de óculos
    if (aiKnowledge['a_oculos'] === false) {
      if (q.id === 'a_oculos_sol') return false;
    }

    // Se sabemos que É homem (SIM), não perguntar se é mulher
    if (aiKnowledge['g_homem'] === true && q.id === 'g_mulher') return false;
    // Se sabemos que NÃO é homem (NÃO), não perguntar se é homem novamente (já filtrado acima) 
    // e poderíamos inferir que é mulher, mas o filtro de "já conhecido" lida com g_homem.
    // Adicionando: se sabemos que é mulher, não perguntar se é homem.
    if (aiKnowledge['g_mulher'] === true && q.id === 'g_homem') return false;

    // Se sabemos que NÃO tem barba/bigode, não perguntar sobre bigode especificamente
    if (aiKnowledge['b_barba_bigode'] === false) {
      if (q.id === 'b_bigode') return false;
    }

    // Filtro original de turno
    return !q.minTurn || turn >= q.minTurn;
  });
  
  const defaultQuestion = QUESTIONS[0]!;
  if (availableQuestions.length === 0) return defaultQuestion;

  if (difficulty === "Fácil") {
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex] || defaultQuestion;
  }

  const scoredQuestions = availableQuestions.map((q) => {
    const matchingCount = remainingCharacters.filter((c) => q.check(c)).length;
    const nonMatchingCount = remainingCharacters.length - matchingCount;

    let score = 0;
    if (difficulty === "Médio") {
      score = 1 / (Math.abs(matchingCount - nonMatchingCount) + 1);
    } else {
      const pMatch = matchingCount / remainingCharacters.length;
      const pNoMatch = nonMatchingCount / remainingCharacters.length;
      
      if (pMatch === 0 || pNoMatch === 0) {
        score = -1;
      } else {
        score = -(pMatch * Math.log2(pMatch) + pNoMatch * Math.log2(pNoMatch));
      }
    }

    return { question: q, score };
  });

  scoredQuestions.sort((a, b) => b.score - a.score);
  return scoredQuestions[0]?.question || defaultQuestion;
};

export const getAIPalpite = (
  difficulty: Difficulty,
  remainingCharacters: Character[]
): Character | null => {
  if (remainingCharacters.length === 0) return null;
  
  // No Easy, a IA demora a palpitar mesmo com poucos personagens
  if (difficulty === "Fácil") {
    if (remainingCharacters.length === 1 && Math.random() > 0.8) return remainingCharacters[0] || null;
    return null;
  }

  // No Médio, ela palpita quando resta 1, ou tem chance com 2
  if (difficulty === "Médio") {
    if (remainingCharacters.length === 1 && Math.random() > 0.5) return remainingCharacters[0] || null;
    // Removida a chance de palpitar com 2 no médio para evitar palpites errados precoces
    return null;
  }

  // No Difícil, ela é agressiva
  if (difficulty === "Difícil") {
    if (remainingCharacters.length === 1) return remainingCharacters[0] || null;
    if (remainingCharacters.length <= 2 && Math.random() > 0.6) {
      return remainingCharacters[Math.floor(Math.random() * remainingCharacters.length)] || null;
    }
  }
  
  return null;
};
