import { Character, CHARACTERS } from "./characters";

export type Question = {
  id: string;
  text: string;
  category: string;
  check: (char: Character) => boolean;
  minTurn?: number;
};

export const QUESTIONS: Question[] = [
  // Gênero
  { id: "g_homem", text: "O seu personagem é homem?", category: "Gênero", minTurn: 2, check: (c) => c.genero === "Masculino" },
  { id: "g_mulher", text: "O seu personagem é mulher?", category: "Gênero", minTurn: 2, check: (c) => c.genero === "Feminino" },
  
  // Cabelo Cor
  { id: "c_loiro", text: "Tem cabelo loiro?", category: "Cabelo", check: (c) => c.corCabelo === "Loiro" },
  { id: "c_ruivo", text: "Tem cabelo ruivo?", category: "Cabelo", check: (c) => c.corCabelo === "Ruivo" },
  { id: "c_preto", text: "Tem cabelo preto?", category: "Cabelo", check: (c) => c.corCabelo === "Preto" },
  { id: "c_grisalho", text: "Tem cabelo branco/grisalho?", category: "Cabelo", check: (c) => c.corCabelo === "Grisalho/Branco" || c.corCabelo === "Grisalho" },
  { id: "c_castanho", text: "Tem cabelo castanho?", category: "Cabelo", check: (c) => c.corCabelo === "Castanho" },
  
  // Cabelo Estilo
  { id: "c_curto", text: "Tem cabelo curto?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("curto") },
  { id: "c_longo", text: "Tem cabelo longo/médio?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("longo") || c.estiloCabelo.toLowerCase().includes("médio") },
  { id: "c_careca", text: "É careca?", category: "Cabelo", check: (c) => c.corCabelo === "Careca" || c.estiloCabelo.toLowerCase().includes("careca") || c.estiloCabelo.toLowerCase().includes("calvo") },
  { id: "c_trancas", text: "Usa tranças ou coque?", category: "Cabelo", check: (c) => c.estiloCabelo.toLowerCase().includes("tranças") || c.estiloCabelo.toLowerCase().includes("coque") },
  
  // Olhos & Rosto
  { id: "o_azuis", text: "Tem olhos azuis?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Azuis" },
  { id: "o_verdes", text: "Tem olhos verdes?", category: "Olhos & Rosto", check: (c) => c.corOlhos === "Verdes" },
  { id: "o_sardas", text: "Tem sardas no rosto?", category: "Olhos & Rosto", check: (c) => c.acessoriosExtra.toLowerCase().includes("sardas") },
  
  // Acessórios
  { id: "a_oculos", text: "Usa óculos?", category: "Acessórios", check: (c) => c.oculos },
  { id: "a_oculos_sol", text: "Usa óculos de sol?", category: "Acessórios", check: (c) => c.acessoriosExtra.toLowerCase().includes("sol") || (c.oculos && c.corOlhos === "Ocultos") },
  { id: "a_chapeu", text: "Usa chapéu, boné ou boina?", category: "Acessórios", check: (c) => c.chapeuBoneFaixa !== "Nenhum" && !c.chapeuBoneFaixa.toLowerCase().includes("faixa") && !c.chapeuBoneFaixa.toLowerCase().includes("palitos") },
  { id: "a_faixa", text: "Usa faixa na cabeça?", category: "Acessórios", check: (c) => c.chapeuBoneFaixa.toLowerCase().includes("faixa") },
  { id: "a_brincos", text: "Usa brincos?", category: "Acessórios", check: (c) => c.brincos },
  
  // Barba
  { id: "b_barba_bigode", text: "Tem barba ou bigode?", category: "Barba e Bigode", check: (c) => c.barbaBigode !== "Nenhum" },
  { id: "b_bigode", text: "Tem bigode?", category: "Barba e Bigode", check: (c) => c.barbaBigode.toLowerCase().includes("bigode") },
  
  // Pele & Detalhes
  { id: "p_negra", text: "Tem pele negra?", category: "Pele & Detalhes", check: (c) => c.tomPele.toLowerCase().includes("negra") || c.tomPele.toLowerCase().includes("negro") },
  { id: "p_curativo", text: "Tem curativo no nariz?", category: "Pele & Detalhes", check: (c) => c.acessoriosExtra.toLowerCase().includes("curativo") },
];
