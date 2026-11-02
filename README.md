# Maria Clara & Gabriel

Lista de presentes para **20 de agosto de 2028**, em verde oliva, off-white e dourado. Catálogo responsivo, presentes simbólicos, busca, categorias, ordenação, mensagens dos convidados, pedidos persistidos e painel privado.

A [análise da referência e dos pagamentos](docs/REFERENCIA-E-PAGAMENTOS.md) foi escrita antes da implementação. A identidade atual combina a paleta do casamento com as fotos de memes enviadas pelo casal, cartões maiores e textos curtos. O catálogo tem 24 sugestões; inicialmente mostra 12, com filtros e botão para ver mais. As fontes e imagens são locais, sem depender de serviços externos durante a navegação.

O monograma MG usa uma versão com fundo transparente preparada a partir da logo enviada pelo casal. Ele aparece no cabeçalho, rodapé e área administrativa. A prévia inclui uma versão WebP otimizada e um ícone de aba menor; o arquivo original `public/wedding-logo.png` está preservado.

As fotos de memes vieram do ZIP enviado pelo usuário. As fotos de aspirador, air fryer, panelas e cafeteira são imagens ilustrativas geradas para o projeto, sem marca ou modelo prometido. Os valores são sugestões de contribuição, não ofertas de uma loja. Os detalhes de cada presente ficam na janela de seleção, mantendo a lista visualmente enxuta.

## Abrir com um clique no arquivo

Abra o **`index.html` da raiz do projeto** no navegador. Ele é uma prévia independente: inclui todos os estilos, fontes, ilustrações e a demonstração do catálogo, sem instalar dependências ou iniciar um servidor. Pode ser copiado sozinho para outra pasta e aberto sem internet. Não use `src/index.html` nem `dist/index.html` para esse modo.

A prévia permite navegar, buscar, filtrar e experimentar um presente. Nenhum dado é enviado aos noivos, nomes/e-mails/mensagens não são guardados e as simulações são apagadas ao recarregar. O painel privado e os pagamentos reais dependem do site completo, executado pelo servidor conforme as instruções abaixo.

O arquivo é gerado por `npm run build` (ou `npm run build:preview`). Edite os arquivos em `src/`, não o HTML gerado. Abrir no editor de código mostra o código; para ver o site, escolha abrir com um navegador.

## Executar

Para a demonstração gratuita online, consulte [as instruções de GitHub Pages](docs/HOSPEDAGEM.md). A publicação estática permite experimentar o site; o painel e os recebimentos reais exigem a implantação completa descrita abaixo.

Requisito: **Node 24** (o banco utiliza `node:sqlite`) e npm.

```sh
cd /workspace/teste
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run build
npm start
```

O servidor serve a aplicação compilada e a API na porta 3001. Para editar com atualização automática, use `npm run dev`: cliente na porta 5173 e API na porta 3001. Não execute ambos simultaneamente na mesma porta. `PORT` pode alterar a porta da API de produção; ao alterar em desenvolvimento, ajuste também o proxy do Vite.

O padrão é **demonstração**, sem cobrança, QR pagável ou cartão real. Os convidados preenchem nome/e-mail/mensagem, selecionam uma preferência de pagamento e podem simular a confirmação. Fechar a janela não desfaz uma reserva: o botão “Acompanhar meu presente” permite retomar no mesmo navegador/aba, inclusive após recarregar. Em demonstração, é possível cancelar a reserva ou liberar todas as demonstrações pelo painel.

## Acesso privado dos noivos

Em um terminal interativo, dentro da pasta do projeto:

```sh
npm run admin:setup
```

Defina uma senha com pelo menos 12 caracteres. A entrada não é exibida. O utilitário guarda somente um hash scrypt em `.local/admin.env` (ignorado pelo Git, permissões restritas). Ele não sobrescreve uma configuração existente. Reinicie o servidor e acesse a rota `/admin`. Não há senha padrão ou recuperação automática. Para produção, configure `ADMIN_PASSWORD_HASH` por um canal seguro de variáveis do serviço e mantenha um procedimento de recuperação. Não informe a senha no chat ou em argumentos de comandos.

O painel permite consultar convidados, mensagens, pedidos, pagamentos e valores reais confirmados; simulações aparecem separadamente. Também permite criar/editar presentes e ocultá-los do catálogo. Os pedidos preservam o nome e o valor do momento da reserva. A galeria inclui fotos, memes e ilustrações locais; upload de imagens pelo painel não foi implementado.

A migração do catálogo atualiza apenas os presentes iniciais que ainda correspondem exatamente à versão anterior, adiciona novas sugestões e preserva alterações do casal e pedidos existentes. Os presentes antigos não são apagados do banco. A migração é registrada e não volta a sobrescrever dados nos reinícios seguintes.

## Pagamentos reais: integração preliminar, bloqueada por padrão

**Pix efetivo e cartão efetivo ainda não foram homologados.** O acesso à documentação oficial da InfinitePay e à página pública do Casar.com foi bloqueado pelo proxy. Os testes do adaptador usam respostas controladas, sem chamadas de cobrança reais.

Antes de habilitar pagamentos:

1. Nas configurações de rede, salvar os domínios registrados no rascunho e confirmar acesso à documentação oficial. Consultar novamente o contrato atual das APIs; o adaptador em `server/payments.js` é preliminar.
2. Informar `INFINITEPAY_HANDLE`, o identificador público da conta. Confirmar que a conta recebe Pix e cartão por checkout e quais são as condições de parcelamento/tarifas.
3. Validar criação de link, retorno, webhook, consulta de pagamento, vínculo da transação ao pedido, valores em centavos e estados de expiração/estorno. Ajustar o adaptador se o contrato oficial diferir.
4. Implantar em HTTPS com domínio público, `PUBLIC_URL` na origem exata (sem caminho/barra final), senha administrativa segura, banco persistente, backup e rede autorizada para `api.infinitepay.io`. Preencher o responsável e contato de privacidade antes de coletar dados reais.
5. Somente após essa validação, usar `PAYMENTS_MODE=live`, `INFINITEPAY_CONTRACT_VERIFIED=true` e `NODE_ENV=production`. O marcador é uma confirmação operacional humana, não uma validação automática da API.
6. Fazer uma transação controlada autorizada pelo titular e conferir o registro, a liquidação e as notificações repetidas. Nenhum pagamento real foi executado por este projeto durante o desenvolvimento.

A preferência Pix/cartão é registrada pelo site; a escolha efetiva acontece no checkout da InfinitePay. Não se afirma que a API permite restringir a modalidade. Não há coleta de dados de cartão pelo site. Pix estático não é usado como prova de pagamento. Estornos, chargebacks, reembolso automático, e-mail de confirmação e conciliação periódica não foram implementados.

O retorno de um checkout não confirma a cobrança. O servidor consulta o provedor e exige confirmação e valor compatível. A reserva usa transação e restrição única por presente; a confirmação é idempotente e identificadores de transação não podem ser reutilizados. Notificações têm uma URL de capacidade aleatória por pedido e são verificadas no provedor, sem alegar uma assinatura oficial não documentada. Um checkout que falhar ou expirar sem certeza mantém a reserva para conferência; é necessário implementar/liberar uma política de expiração real após validar o contrato. Reservas reais não podem ser liberadas pelo botão de demonstração.

## Persistência e implantação

Banco: `.local/wedding.sqlite`, sobrescrevível com `DATABASE_PATH`. A pasta `.local/` e os arquivos SQLite devem permanecer privados e em volume persistente. Para backup com o servidor em uso, use a API de backup do SQLite ou procedimento consistente, considerando os arquivos WAL; não copie apenas o arquivo principal durante escrita.

Esta implementação suporta **uma instância Node**. Para múltiplas réplicas, migrar para PostgreSQL, limites de frequência compartilhados e gestão de sessões compatível. Configure o proxy confiável explicitamente antes de colocar o servidor atrás de balanceadores; não aceite cabeçalhos de IP arbitrários. A publicação do ambiente Codex não publica automaticamente um site no domínio dos convidados.

## Validação

```sh
npm test
npm run test:e2e
```

Os testes do servidor verificam concorrência, idempotência, valor calculado no servidor, privacidade de pedidos, autenticação, CSRF, limite de tentativas inválidas, persistência e confirmação do provedor com respostas simuladas. O navegador verifica desktop/celular, filtros, ordenação, confirmação de demonstração, painel, retomada/cancelamento, edição de presentes e foco do modal.

Os testes E2E iniciam uma API com banco em memória na porta 3002, separada do banco do casal. A senha presente no fixture vale somente nesse servidor de testes. Chromium do sistema é usado quando disponível; em outros ambientes, forneça `CHROMIUM_PATH` ou instale o navegador do Playwright pelos procedimentos oficiais. O download automático de Chromium foi bloqueado neste ambiente; o Chromium já instalado funcionou.

## Estrutura

- `src/`: aplicação pública e painel em React/TypeScript.
- `src/index.html`: entrada do Vite para desenvolvimento e produção; o `index.html` da raiz é a prévia independente gerada.
- `server/`: API Express, SQLite, sessões e adaptador de pagamento.
- `public/`: ilustrações SVG locais e monograma.
- `scripts/generate-art.py`: fonte das ilustrações; não é necessária para iniciar o site.
- `scripts/build-preview.mjs` e `scripts/preview-entry.jsx`: geram a prévia em arquivo único, isolada da API do site.
- `docs/`: análise visual e decisões de implementação.

Os textos e presentes iniciais são propostas, sem endereço, horário ou história inventada para o casal. Revise-os antes do lançamento.
