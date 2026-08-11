import { Character, CHARACTERS } from "./characters";

export type Question = {
  id: string;
  text: string;
  category: string;
  check: (char: Character) => boolean;
  minTurn?: number;
};

export const QUESTIONS: Question[] = [
  // Gênero (Mantendo IDs para compatibilidade, mas a IA priorizará outras categorias se minTurn não for atingido)
  { id: "g_homem", text: "O seu personagem é homem?", category: "Gênero", minTurn: 0, check: (c) => c.genero === "Masculino" },
  { id: "g_mulher", text: "O seu personagem é mulher?", category: "Gênero", minTurn: 0, check: (c) => c.genero === "Feminino" },
  
  // Cabelo Cor
  { id: "c_loiro", text: "Tem cabelo loiro?", category: "Cabelo", check: (c) => c.corCabelo === "Loiro" },
  { id: "c_ruivo", text: "Tem cabelo ruivo?", category: "Cabelo", check: (c) => c.corCabelo === "Ruivo" },
  { id: "c_preto", text: "Tem cabelo preto?", category: "Cabelo", check: (c) => c.corCabelo === "Preto" },
  { id: "c_grisalho", text: "Tem cabelo branco/grisalho?", category: "Cabelo", check: (c) => c.corCabelo === "Grisalho/Branco" || c.corCabelo === "Grisalho" },
  { id: "c_castanho", text: "Tem cabelo castanho?", category: "Cabelo", check: (c) => c.corCabelo === "Castanho" },
  
  // Cabelo Estilo (Novas perguntas de Cabelo)
  { id: "c_curto", text: "Tem cabelo curto?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("curto") },
  { id: "c_longo", text: "Tem cabelo longo?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("longo") },
  { id: "c_cacheado", text: "Tem cabelo cacheado?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("cacheado") || c.estiloCabelo.toLowerCase().includes("ondulado") },
  { id: "c_crespo", text: "Tem cabelo crespo/afro?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("afro") || c.estiloCabelo.toLowerCase().includes("crespo") },
  { id: "c_preso", text: "O cabelo está preso?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("coque") || c.estiloCabelo.toLowerCase().includes("preso") || c.chapeuBoneFaixa.toLowerCase().includes("palitos") },
  { id: "c_trancas", text: "Usa tranças?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("tranças") },
  { id: "c_careca", text: "É careca ou calvo?", category: "Cabelo", check: (c) => c.corCabelo === "Careca" || c.estiloCabelo.toLowerCase().includes("careca") || c.estiloCabelo.toLowerCase().includes("calvo") },
  
  // Olhos & Rosto (Novas perguntas de Olhos & Rosto)
  { id: "o_azuis", text: "Tem olhos azuis?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Azuis" },
  { id: "o_verdes", text: "Tem olhos verdes?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Verdes" },
  { id: "o_castanhos", text: "Tem olhos castanhos?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Castanhos" },
  { id: "o_escuros", text: "Tem olhos muito escuros?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Escuros" },
  { id: "o_ocultos", text: "Os olhos estão ocultos (por óculos de sol)?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Ocultos" },
  { id: "o_sardas", text: "Tem sardas no rosto?", category: "Olhos & Rosto", check: (c) => c.acessoriosExtra.toLowerCase().includes("sardas") },
  { id: "o_sorriso", text: "Tem um sorriso bem aparente?", category: "Olhos & Rosto", check: (c) => c.acessoriosExtra.toLowerCase().includes("sorriso") },
  
  // Acessórios (Novas perguntas de Acessórios)
  { id: "a_oculos_grau", text: "Usa óculos de grau?", category: "Acessórios", check: (c) => c.oculos && c.corOlhos !== "Ocultos" },
  { id: "a_oculos_sol", text: "Usa óculos de sol?", category: "Acessórios", check: (c) => c.acessoriosExtra.toLowerCase().includes("sol") || (c.oculos && c.corOlhos === "Ocultos") },
  { id: "a_chapeu", text: "Usa chapéu ou boina?", category: "Acessórios", check: (c) => c.chapeuBoneFaixa.toLowerCase().includes("chapéu") || c.chapeuBoneFaixa.toLowerCase().includes("boina") || c.chapeuBoneFaixa.toLowerCase().includes("fedora") },
  { id: "a_bone", text: "Usa boné?", category: "Acessórios", check: (c) => c.chapeuBoneFaixa.toLowerCase().includes("boné") },
  { id: "a_faixa", text: "Usa faixa na cabeça?", category: "Acessórios", check: (c) => c.chapeuBoneFaixa.toLowerCase().includes("faixa") },
  { id: "a_brincos", text: "Está usando brincos?", category: "Acessórios", check: (c) => c.brincos },
  { id: "a_colar", text: "Usa colar ou jóias no pescoço?", category: "Acessórios", check: (c) => c.acessoriosExtra.toLowerCase().includes("colar") || c.acessoriosExtra.toLowerCase().includes("pérolas") },
  { id: "a_cabelo", text: "Tem algum acessório no cabelo (presilha/palitos)?", category: "Acessórios", check: (c) => c.chapeuBoneFaixa.toLowerCase().includes("palitos") },

  // Barba e Bigode (Novas perguntas de Barba)
  { id: "b_tem_algo", text: "Tem barba ou bigode?", category: "Barba e Bigode", check: (c) => c.barbaBigode !== "Nenhum" },
  { id: "b_barba", text: "Tem barba?", category: "Barba e Bigode", check: (c) => c.barbaBigode.toLowerCase().includes("barba") },
  { id: "b_bigode", text: "Tem apenas bigode?", category: "Barba e Bigode", check: (c) => c.barbaBigode.toLowerCase().includes("bigode") && !c.barbaBigode.toLowerCase().includes("barba") },
  
  // Pele & Detalhes (Novas perguntas de Pele & Detalhes)
  { id: "p_clara", text: "Tem pele clara?", category: "Pele & Detalhes", check: (c) => c.tomPele.toLowerCase().includes("claro") },
  { id: "p_morena", text: "Tem pele morena?", category: "Pele & Detalhes", check: (c) => c.tomPele.toLowerCase().includes("moreno") },
  { id: "p_negra", text: "Tem pele negra?", category: "Pele & Detalhes", check: (c) => c.tomPele.toLowerCase().includes("negra") || c.tomPele.toLowerCase().includes("negro") },
  { id: "p_curativo", text: "Tem curativo no nariz?", category: "Pele & Detalhes", check: (c) => c.acessoriosExtra.toLowerCase().includes("curativo") },
  { id: "p_roupa_azul", text: "Está usando roupa azul?", category: "Pele & Detalhes", check: (c) => c.corRoupa.toLowerCase().includes("azul") },
  { id: "p_roupa_vermelha", text: "Está usando roupa vermelha?", category: "Pele & Detalhes", check: (c) => c.corRoupa.toLowerCase().includes("vermelho") },
];
