export type Character = {
  id: number;
  nome: string;
  genero: "Masculino" | "Feminino";
  corCabelo: "Castanho" | "Loiro" | "Preto" | "Grisalho/Branco" | "Ruivo" | "Careca" | "Grisalho";
  estiloCabelo: string;
  tomPele: "Claro" | "Moreno" | "Escuro (Negra)" | "Moreno Claro";
  corOlhos: "Verdes" | "Castanhos" | "Azuis" | "Escuros" | "Ocultos";
  barbaBigode: "Nenhum" | "Barba Cheia Ruiva" | "Bigode Grosso" | "Barba Curta Grisalha" | "Barba Cheia Loira";
  oculos: boolean;
  chapeuBoneFaixa: "Nenhum" | "Chapéu Fedora Cinza" | "Boné Vermelho (Trás)" | "Boina Xadrez Verde" | "Palitos no Cabelo" | "Chapéu Fedora Preto" | "Faixa Vermelha";
  brincos: boolean;
  acessoriosExtra: string;
  corRoupa: string;
};

export const CHARACTERS: Character[] = [
  { id: 1, nome: "LIVIA", genero: "Feminino", corCabelo: "Castanho", estiloCabelo: "Curto com franja", tomPele: "Claro", corOlhos: "Verdes", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: true, acessoriosExtra: "Nenhum", corRoupa: "Laranja/Rosa" },
  { id: 2, nome: "LUCAS", genero: "Masculino", corCabelo: "Castanho", estiloCabelo: "Curto penteado", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Marrom" },
  { id: 3, nome: "BERNARDO", genero: "Masculino", corCabelo: "Loiro", estiloCabelo: "Curto ondulado", tomPele: "Claro", corOlhos: "Azuis", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Chapéu Fedora Cinza", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Azul" },
  { id: 4, nome: "CAIO", genero: "Masculino", corCabelo: "Preto", estiloCabelo: "Curto com franja", tomPele: "Moreno", corOlhos: "Verdes", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Boné Vermelho (Trás)", brincos: false, acessoriosExtra: "Agasalho c/ capuz", corRoupa: "Azul" },
  { id: 5, nome: "HELENA", genero: "Feminino", corCabelo: "Grisalho/Branco", estiloCabelo: "Curto volumoso", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: true, acessoriosExtra: "Colar de Pérolas", corRoupa: "Branco" },
  { id: 6, nome: "NATHALIA", genero: "Feminino", corCabelo: "Preto", estiloCabelo: "Cacheado/Afro curto", tomPele: "Escuro (Negra)", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Escura" },
  { id: 7, nome: "GAEL", genero: "Masculino", corCabelo: "Ruivo", estiloCabelo: "Curto espetado", tomPele: "Claro", corOlhos: "Azuis", barbaBigode: "Barba Cheia Ruiva", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Azul" },
  { id: 8, nome: "ALICE", genero: "Feminino", corCabelo: "Ruivo", estiloCabelo: "Tranças duplas", tomPele: "Claro", corOlhos: "Verdes", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Sardas no rosto", corRoupa: "Jardineira Jeans" },
  { id: 9, nome: "OTAVIO", genero: "Masculino", corCabelo: "Castanho", estiloCabelo: "Curto penteado", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Bigode Grosso", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Verde" },
  { id: 10, nome: "ARTHUR", genero: "Masculino", corCabelo: "Careca", estiloCabelo: "Calvo / Branco", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: true, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Casaco Marrom" },
  { id: 11, nome: "DAVI", genero: "Masculino", corCabelo: "Grisalho", estiloCabelo: "Curto penteado", tomPele: "Moreno", corOlhos: "Castanhos", barbaBigode: "Barba Curta Grisalha", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Verde" },
  { id: 12, nome: "CAMILA", genero: "Feminino", corCabelo: "Loiro", estiloCabelo: "Longo ondulado", tomPele: "Moreno Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Amarelo" },
  { id: 13, nome: "BEATRIZ", genero: "Feminino", corCabelo: "Grisalho/Branco", estiloCabelo: "Coque alto", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: true, chapeuBoneFaixa: "Nenhum", brincos: true, acessoriosExtra: "Nenhum", corRoupa: "Roxo" },
  { id: 14, nome: "SAMUEL", genero: "Masculino", corCabelo: "Careca", estiloCabelo: "Careca", tomPele: "Escuro (Negro)", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Sorriso amplo", corRoupa: "Amarelo" },
  { id: 15, nome: "LARA", genero: "Feminino", corCabelo: "Ruivo", estiloCabelo: "Médio ondulado", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: true, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Sardas no rosto", corRoupa: "Verde Água" },
  { id: 16, nome: "RAQUEL", genero: "Feminino", corCabelo: "Preto", estiloCabelo: "Curto liso c/ franja", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: true, acessoriosExtra: "Nenhum", corRoupa: "Roxo" },
  { id: 17, nome: "YURI", genero: "Masculino", corCabelo: "Preto", estiloCabelo: "Curto liso", tomPele: "Claro", corOlhos: "Escuros", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Azul" },
  { id: 18, nome: "VICENTE", genero: "Masculino", corCabelo: "Grisalho/Branco", estiloCabelo: "Curto idoso", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Boina Xadrez Verde", brincos: false, acessoriosExtra: "Colete Verde", corRoupa: "Verde/Branco" },
  { id: 19, nome: "HEITOR", genero: "Masculino", corCabelo: "Loiro", estiloCabelo: "Espetado", tomPele: "Claro", corOlhos: "Ocultos", barbaBigode: "Barba Cheia Loira", oculos: true, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Jeans Azul" },
  { id: 20, nome: "MAYARA", genero: "Feminino", corCabelo: "Preto", estiloCabelo: "Coque c/ palitos", tomPele: "Claro", corOlhos: "Escuros", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Palitos no Cabelo", brincos: true, acessoriosExtra: "Estilo Oriental", corRoupa: "Vermelho" },
  { id: 21, nome: "ENZO", genero: "Masculino", corCabelo: "Preto", estiloCabelo: "Espetado", tomPele: "Claro", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: true, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Azul" },
  { id: 22, nome: "ISADORA", genero: "Feminino", corCabelo: "Loiro", estiloCabelo: "Chanel curto", tomPele: "Claro", corOlhos: "Azuis", barbaBigode: "Nenhum", oculos: true, chapeuBoneFaixa: "Chapéu Fedora Preto", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Preto" },
  { id: 23, nome: "LORENA", genero: "Feminino", corCabelo: "Preto", estiloCabelo: "Ondulado médio", tomPele: "Claro", corOlhos: "Azuis", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Nenhum", brincos: false, acessoriosExtra: "Nenhum", corRoupa: "Escuro" },
  { id: 24, nome: "THIAGO", genero: "Masculino", corCabelo: "Preto", estiloCabelo: "Afro curto", tomPele: "Escuro (Negro)", corOlhos: "Castanhos", barbaBigode: "Nenhum", oculos: false, chapeuBoneFaixa: "Faixa Vermelha", brincos: false, acessoriosExtra: "Curativo no Nariz", corRoupa: "Amarelo" },
];
