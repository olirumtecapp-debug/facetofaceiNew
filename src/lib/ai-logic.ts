import { Character, CHARACTERS } from "@/data/characters";
import { Question, QUESTIONS } from "@/data/questions";

export type Difficulty = "Fácil" | "Médio" | "Difícil";

export const getAIResponse = (character: Character, question: Question): boolean => {
  return question.check(character);
};

export const getBestAIQuestion = (
  difficulty: Difficulty,
  remainingCharacters: Character[],
  turn: number
): Question => {
  const availableQuestions = QUESTIONS.filter((q) => !q.minTurn || turn >= q.minTurn);
  if (availableQuestions.length === 0) return QUESTIONS[0];

  if (difficulty === "Fácil") {

    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  }

  // Calculate scores for each question
  const scoredQuestions = availableQuestions.map((q) => {
    const matchingCount = remainingCharacters.filter((c) => q.check(c)).length;
    const nonMatchingCount = remainingCharacters.length - matchingCount;

    let score = 0;
    if (difficulty === "Médio") {
      // Aim for ~50/50 split
      score = 1 / (Math.abs(matchingCount - nonMatchingCount) + 1);
    } else {
      // Difícil: Information Theory (Entropy)
      // We want to maximize the reduction in uncertainty
      const pMatch = matchingCount / remainingCharacters.length;
      const pNoMatch = nonMatchingCount / remainingCharacters.length;
      
      if (pMatch === 0 || pNoMatch === 0) {
        score = -1; // Useless question
      } else {
        // H(X) = -Σ p(x) log2 p(x)
        score = -(pMatch * Math.log2(pMatch) + pNoMatch * Math.log2(pNoMatch));
      }
    }

    return { question: q, score };
  });

  // Sort by score descending and pick the best
  scoredQuestions.sort((a, b) => b.score - a.score);
  return scoredQuestions[0].question;
};

export const getAIPalpite = (
  difficulty: Difficulty,
  remainingCharacters: Character[]
): Character | null => {
  if (remainingCharacters.length === 1) return remainingCharacters[0];
  if (difficulty === "Difícil" && remainingCharacters.length === 2) {
    // 50% chance to risk it when 2 remain
    return Math.random() > 0.5 ? remainingCharacters[Math.floor(Math.random() * 2)] : null;
  }
  return null;
};
