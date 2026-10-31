# Hospedagem gratuita da demonstração

O usuário escolheu começar pela demonstração gratuita. O repositório `Gabrielpdesz/teste` já é público, conforme os metadados públicos do GitHub; não houve alteração de visibilidade. GitHub Pages permite usar essa conta e esse repositório sem criar uma conta em outra hospedagem.

## O que é publicado

Somente a demonstração estática de `site-preview/index.html` e um marcador `.nojekyll`. Todos os recursos visuais são incluídos no HTML. A demonstração permite navegar, buscar, filtrar, selecionar e simular um presente no navegador. Nenhum valor é cobrado e nenhum dado de convidado é enviado a um servidor. As simulações são apagadas ao recarregar. O painel privado e os pagamentos reais não fazem parte desta hospedagem estática.

## Preparar e enviar uma atualização

Dentro da pasta do projeto:

```sh
npm run build:preview
npm run prepare:hosting
npm run publish:preview
```

O último comando envia uma nova versão à branch `gh-pages` usando o acesso Git existente. Não muda de branch no checkout de desenvolvimento, não inclui arquivos do banco ou de credenciais, preserva o histórico da branch de publicação e não usa push forçado. Ele não habilita sozinho o serviço GitHub Pages.

## Habilitar GitHub Pages uma vez

No repositório do GitHub, abra **Settings → Pages**. Em **Build and deployment**, selecione:

- **Source:** Deploy from a branch.
- **Branch:** gh-pages.
- **Folder:** / (root).

Salve. O GitHub exibirá o endereço público após concluir a publicação. A atualização da branch passa a disparar novas publicações. Não é necessário domínio próprio; ele pode ser configurado depois. Não considere a prévia publicada apenas porque o push terminou: confira o resultado em Pages/Actions e o site servido.

O acesso Git de leitura funciona neste ambiente. As consultas à API `api.github.com` foram bloqueadas pelo proxy; o domínio foi acrescentado ao rascunho de rede. O endereço público do site também precisa ser acessível para validação externa. Alterações salvas no rascunho não comprovam aplicação na máquina nem habilitação de Pages na conta GitHub.

## Evolução para o site completo

GitHub Pages serve arquivos estáticos. O site completo exige hospedar `server/index.js` em Node 24, configurar HTTPS, um banco persistente, senha administrativa e a conta InfinitePay. Essa etapa deve manter os pagamentos em demonstração até a homologação do provedor. Não utilizar a demonstração estática para receber contribuições reais.
