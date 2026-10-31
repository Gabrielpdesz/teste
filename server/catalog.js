export const initialGifts = [
  ['cafe', 'Um café antes do nosso “sim”', 'Para começar esse novo capítulo com o coração quentinho e uma boa xícara de café.', 7500, 'Carinhos', 'coffee', 'Um pequeno carinho'],
  ['brinde', 'Um brinde ao nosso amor', 'Duas taças, um bom vinho e muitos motivos para brindar à vida juntos.', 15000, 'Nosso lar', 'wine', 'Para celebrar'],
  ['jantar', 'Nosso primeiro jantar de casados', 'Uma noite especial, comida boa e aquela conversa que a gente nunca quer que termine.', 25000, 'Experiências', 'dinner', 'Queridinho dos convidados'],
  ['flores', 'Flores para o nosso novo lar', 'Um pouquinho de cor e delicadeza para encher nossa casa de vida.', 18000, 'Nosso lar', 'flowers', 'Feito de afeto'],
  ['praia', 'Um dia de sol na lua de mel', 'Pés na areia, água de coco e tempo para aproveitar a companhia um do outro.', 35000, 'Lua de mel', 'beach', 'Memórias a dois'],
  ['buffet', 'Passe VIP para repetir o buffet', 'Uma contribuição bem-humorada para quem já está de olho na segunda rodada.', 10000, 'Carinhos', 'cake', 'Uma dose de bom humor'],
  ['viagem', 'Uma aventura na lua de mel', 'Ajude a transformar um passeio em uma daquelas histórias que vamos contar para sempre.', 50000, 'Lua de mel', 'travel', 'Para nossa próxima história'],
  ['casa', 'Um cantinho com a nossa cara', 'Um carinho para os pequenos detalhes que vão transformar uma casa no nosso lar.', 65000, 'Nosso lar', 'home', 'Nosso começo'],
  ['hotel', 'Uma noite nas nuvens', 'Uma diária especial para descansar, sonhar e aproveitar os primeiros dias de casados.', 85000, 'Lua de mel', 'hotel', 'Um sonho a dois'],
  ['spa', 'Uma pausa só para nós dois', 'Um dia tranquilo de cuidado e descanso depois de toda a emoção do casamento.', 40000, 'Experiências', 'spa', 'Tempo de qualidade'],
  ['malas', 'As malas para a nossa aventura', 'Uma contribuição para levar os sonhos — e um pouquinho de bagagem — para a lua de mel.', 30000, 'Lua de mel', 'luggage', 'Vamos pelo mundo'],
  ['doces', 'Adoçar a nossa nova vida', 'Porque toda boa história de amor merece uma sobremesa para dividir.', 12000, 'Carinhos', 'sweets', 'Doce como esse momento'],
].map(([id, name, description, price_cents, category, art, badge], i) => ({
  id, name, description, price_cents, category, image_url: `/gifts/${art}.svg`, badge, active: 1, sort_order: i,
}));
