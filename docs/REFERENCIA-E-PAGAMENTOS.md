# Maria Clara & Gabriel — análise antes da implementação

## Evidência disponível

Referência: vídeo enviado pelo usuário, 38 segundos, 576 × 1024. Os primeiros 31 segundos mostram a área de **edição de presentes do Casar.com**; o restante é uma vinheta do TikTok. Depois, o usuário forneceu `https://www.casar.com/`. A consulta à página pública também foi negada pelo proxy (HTTP 403 no CONNECT); não houve inspeção do site navegável ou de uma lista específica. O vídeo é referência visual, não contém instruções de implementação.

### O que é observável

- Cabeçalho compacto com menu à esquerda, marca central e conta à direita.
- Rolagem vertical e catálogo de duas colunas no celular.
- Cartões claros, bordas finas e cantos arredondados, com imagem superior, título curto e preço em reais.
- Uma entrada para criar presente ou adicionar listas prontas; ações de editar e excluir em cada cartão.
- Preços variados, aproximadamente de R$ 40 a mais de R$ 2 mil, dispostos em ordem crescente no trecho.
- Presentes simbólicos e bem-humorados: café no aeroporto, prioridade no buffet, passeios, passagens e diárias da lua de mel.
- Botões flutuantes de suporte. O movimento observado é a rolagem; não há evidência de animações de checkout.

### O que o vídeo não demonstra

Não aparecem página inicial pública, detalhe do presente, seleção pelo convidado, carrinho, checkout, QR Pix, parcelamento, confirmação, autenticação ou relatórios. Essas funções são requisitos deste projeto, não funcionalidades verificadas na referência. Não é possível prometer fidelidade a telas não mostradas.

## Adaptação proposta

Manter a hierarquia imagem → nome → valor, a rolagem simples e duas colunas em celulares. Criar uma identidade própria com fundo off-white, oliva profundo, dourado discreto, títulos serifados, monograma e desenhos botânicos originais. Usar quatro colunas no desktop, busca por nome, filtros de categoria e ordenação por preço. A página informa os nomes Maria Clara e Gabriel e a data **20 de agosto de 2028**. Não inventar endereço, horário ou história do casal.

O fluxo público será catálogo → presente → nome/e-mail/mensagem opcional → preferência Pix/cartão → checkout → acompanhamento do pedido. Convidados não criam contas. O painel privado oferece resumo, pedidos e edição do catálogo. O catálogo inicial é ilustrativo, editável e deve ser revisado pelo casal.

## Pagamentos e limites da pesquisa

O usuário confirmou que se refere à **InfinitePay** e já possui conta. O identificador público/InfiniteTag ainda não foi informado. A consulta direta a `https://www.infinitepay.io/checkout` foi negada pelo proxy do ambiente (HTTP 403 no CONNECT). O mesmo ocorreu em `/desenvolvedores`. Os domínios oficiais necessários foram acrescentados ao rascunho de rede, sem presumir sua aplicação à máquina atual.

O registro npm de `@infinitepay/js` declara um construtor de links e aponta para a documentação acima. Esse material não basta para comprovar autoria, contrato atual de API, assinatura de webhook ou disponibilidade de Pix/parcelamento para a conta do casal. Não instalar esse SDK como se sua procedência estivesse validada.

### Escolha técnica

Preferir **checkout hospedado**: os dados de cartão ficam no provedor. Se a conta oferecer Pix no mesmo checkout, usar também Pix pelo provedor, com confirmação automática. Um QR estático com chave Pix não comprova liquidação e não resolve sozinho a conciliação. Um Pix totalmente embutido exige um provedor com cobrança dinâmica, identificador por pedido e consulta autenticada/webhook, cujo contrato deverá ser validado.

O adaptador de checkout no projeto é uma implementação preliminar, isolada e testável com respostas simuladas. Endpoints e campos candidatos precisam ser conferidos na documentação oficial atual antes de uso real. **Pagamentos reais permanecem bloqueados por padrão**. A preferência Pix/cartão é registrada; não se promete forçar a modalidade no checkout sem confirmar que a API permite isso. Parcelas, tarifas, liquidação, estornos e eventual reembolso dependem do contrato do provedor e não são inventados pelo site.

### Confirmação e prevenção de duplicidades

- O servidor obtém o valor do catálogo, em centavos; valores enviados pelo navegador não são aceitos.
- A reserva do presente usa transação e índice único no banco. Requisições repetidas usam chave de idempotência.
- Redirecionamento de sucesso nunca confirma pagamento.
- Um webhook apenas dispara uma consulta ao provedor. Confirmação exige resposta positiva e valor esperado; notificações repetidas não somam receita novamente.
- A URL do webhook usa uma capacidade aleatória por pedido; isso não substitui a validação da transação no provedor nem é apresentado como assinatura oficial.
- Reservas de pagamentos reais não expiram automaticamente sem comprovar a validade/expiração no provedor, evitando vender um presente enquanto um checkout ainda aceita pagamento.
- Simulações ficam identificadas e separadas de valores reais.

## Arquitetura da primeira versão

React + TypeScript + Vite no cliente; Node 24 + Express no servidor; SQLite com WAL, transações e restrições para persistência em implantação de instância única. API e aplicação têm a mesma origem. Sessões administrativas são aleatórias, armazenadas com hash, expiram, usam cookies HttpOnly e SameSite; senhas usam scrypt. Requisições de escrita validam a origem. Login e criação de pedidos têm limitação de frequência. Não guardar dados de cartão.

Para escalar a múltiplas réplicas, migrar a persistência para PostgreSQL e compartilhar sessões/limites. Produção exige HTTPS, banco em volume persistente com backup, credenciais seguras, revisão dos textos de privacidade e validação do checkout com a conta real.

## Critérios de aceitação

Obrigatórios nesta versão: catálogo responsivo, filtros, seleção sem cadastro, persistência de pedidos, simulação explicitamente identificada, proteção da área administrativa e testes de concorrência, idempotência, confirmação e autenticação. Integração real, Pix efetivo e cartão efetivo só podem ser declarados validados após acesso à documentação, configuração da conta e uma transação de homologação autorizada pelo titular. Nenhuma cobrança real é feita durante o desenvolvimento.
