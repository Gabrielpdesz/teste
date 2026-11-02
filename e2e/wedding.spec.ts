import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const headers={Origin:'http://127.0.0.1:3002'};
test.beforeEach(async({request})=>{
  await request.post('/api/admin/login',{headers,data:{password:'somente-testes-e2e-2028'}});
  await request.post('/api/admin/reset-demo',{headers});
  await request.post('/api/admin/logout',{headers});
});

test('catálogo filtra, busca e ordena sem transbordar a tela',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('.gift-card')).toHaveCount(12);
  await expect(page.locator('.demo-notice')).toContainText('Demonstração · sem cobranças');
  await expect(page.getByRole('heading',{level:1})).toContainText('Casar é coisa séria.');
  await page.getByRole('button',{name:'Lua de mel',exact:true}).click();
  await expect(page.locator('.gift-card')).toHaveCount(5);
  await page.getByRole('button',{name:'Todos os presentes'}).click();
  await page.getByRole('textbox',{name:'Buscar presentes'}).fill('antes do nosso');await expect(page.locator('.gift-card')).toHaveCount(1);
  await page.getByRole('textbox',{name:'Buscar presentes'}).fill('zzzzzz');await expect(page.getByText('Esse presente ainda não está na lista.')).toBeVisible();
  await page.getByRole('button',{name:'Ver todos os presentes'}).click();
  await page.getByRole('combobox',{name:'Ordenar presentes'}).selectOption('asc');
  await expect(page.locator('.gift-price').first()).toHaveText('R$ 50,00');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('convidado presenteia sem cadastro; painel separa demonstração de receita',async({page},testInfo)=>{
  const guestName=`Ana e Pedro (${testInfo.project.name})`;
  await page.goto('/');
  await page.getByRole('textbox',{name:'Buscar presentes'}).fill('antes do nosso');
  await page.locator('.gift-card').filter({hasText:'Um café antes'}).getByRole('button',{name:'Presentear',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await dialog.getByLabel('Seu nome').fill(guestName);await dialog.getByLabel('Seu e-mail').fill('convidados@example.com');
  await dialog.getByLabel('Um recadinho').fill('Que essa história seja cheia de amor!');
  await dialog.getByRole('button',{name:'Cartão Checkout InfinitePay'}).click();
  await dialog.getByRole('button',{name:'Continuar demonstração'}).click();
  await expect(dialog.getByText('Você escolheu cartão de crédito.',{exact:false})).toBeVisible();
  await dialog.getByRole('button',{name:'Simular confirmação do presente'}).click();
  await expect(dialog.getByText('Nenhum valor foi cobrado.',{exact:false})).toBeVisible();
  await dialog.getByRole('button',{name:'Voltar para a lista'}).click();
  await expect(page.locator('.gift-card').filter({hasText:'Um café antes'}).getByRole('button',{name:'Reservado',exact:true})).toBeDisabled();
  await page.goto('/admin');await page.getByLabel('Senha de acesso').fill('somente-testes-e2e-2028');
  await page.getByRole('button',{name:'Entrar no painel'}).click();
  await expect(page.locator('.stats-grid>div').first().locator('strong')).toHaveText('R$ 0,00');
  const record=page.locator('.admin-order').filter({hasText:guestName});
  await expect(record).toContainText('Simulação concluída');
  await expect(record.getByText('Que essa história seja cheia de amor!',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Sair da conta'}).click();await page.reload();
  await expect(page.getByLabel('Senha de acesso')).toBeVisible();
});

test('reserva pode ser retomada após recarregar e cancelada em demonstração',async({page})=>{
  await page.goto('/');await page.locator('.gift-card').first().getByRole('button',{name:'Presentear',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Seu nome').fill('Teste de retomada');await dialog.getByLabel('Seu e-mail').fill('retomada@example.com');
  await dialog.getByRole('button',{name:'Continuar demonstração'}).click();await expect(dialog.getByText('Vamos experimentar?')).toBeVisible();
  await dialog.getByRole('button',{name:'Fechar janela'}).click();await page.reload();
  await page.getByRole('button',{name:'Acompanhar meu presente'}).click();await expect(dialog.getByText('Vamos experimentar?')).toBeVisible();
  await dialog.getByRole('button',{name:'Cancelar esta reserva'}).click();await dialog.getByRole('button',{name:'Sim, liberar presente'}).click();
  await expect(dialog).not.toBeVisible();await expect(page.locator('.gift-card').first().getByRole('button',{name:'Presentear',exact:true})).toBeEnabled();
});

test('noivos criam, editam e ocultam um presente com persistência',async({page},testInfo)=>{
  const name=`Presente especial ${testInfo.project.name}`;
  await page.goto('/admin');await page.getByLabel('Senha de acesso').fill('somente-testes-e2e-2028');await page.getByRole('button',{name:'Entrar no painel'}).click();
  await page.getByRole('button',{name:'Nossos presentes'}).click();await page.getByRole('button',{name:'Criar presente'}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome do presente').fill(name);await dialog.getByLabel('Descrição').fill('Uma experiência criada pelos noivos.');
  await dialog.getByLabel('Valor em reais').fill('123.45');await dialog.getByRole('button',{name:'Salvar presente'}).click();
  await expect(dialog).not.toBeVisible();await page.reload();await page.getByRole('button',{name:'Nossos presentes'}).click();
  const row=page.locator('.admin-gift').filter({hasText:name});await expect(row).toContainText('R$ 123,45');
  await row.getByRole('button',{name:`Editar ${name}`}).click();await dialog.getByLabel('Mostrar na lista').uncheck();await dialog.getByRole('button',{name:'Salvar presente'}).click();
  await expect(row).toContainText('Oculto da lista');await page.goto('/');await expect(page.locator('.gift-card').filter({hasText:name})).toHaveCount(0);
});

test('modal permite saída pelo teclado e devolve foco ao presente',async({page})=>{
  await page.goto('/');const trigger=page.locator('.gift-card').first().getByRole('button',{name:'Presentear',exact:true});
  await trigger.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();await expect(trigger).toBeFocused();
});

test('nova lista combina memes, itens de casa e mais presentes sob demanda',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.gift-card')).toHaveCount(12);
  await page.getByRole('button',{name:'Memes & risadas',exact:true}).click();
  await expect(page.locator('.gift-card').filter({hasText:'Só pra não dizer'})).toHaveCount(1);
  await expect(page.locator('.gift-card').filter({hasText:'Cota para perguntar'})).toHaveCount(1);
  await page.getByRole('button',{name:'Para a nossa casa',exact:true}).click();
  const vacuum=page.locator('.gift-card').filter({hasText:'Um aspirador de pó BOM'});
  await expect(vacuum.locator('img')).toHaveAttribute('src',/aspirador\.webp$/);
  await vacuum.getByRole('button',{name:'Presentear',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('R$ 550,00');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Todos os presentes',exact:true}).click();
  await page.getByRole('button',{name:'Ver mais presentes'}).click();
  await expect(page.locator('.gift-card')).toHaveCount(24);
});

test('index independente funciona sem rede, imagens externas ou servidor',async({page,context})=>{
  const errors:string[]=[];const requests:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await context.setOffline(true);
  await page.setContent(await readFile('index.html','utf8'),{waitUntil:'networkidle'});
  await expect(page.locator('.gift-card')).toHaveCount(12);
  await expect(page.locator('.demo-notice')).toContainText('Demonstração · sem cobranças');
  await page.getByRole('textbox',{name:'Buscar presentes'}).fill('antes do nosso');await expect(page.locator('.gift-card')).toHaveCount(1);
  await page.locator('.gift-card').getByRole('button',{name:'Presentear',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Seu nome').fill('Teste local');await dialog.getByLabel('Seu e-mail').fill('local@example.com');
  await dialog.getByRole('button',{name:'Continuar demonstração'}).click();await dialog.getByRole('button',{name:'Simular confirmação do presente'}).click();
  await expect(dialog.getByText('Nenhum valor foi cobrado.',{exact:false})).toBeVisible();
  await dialog.getByRole('button',{name:'Voltar para a lista'}).click();
  await page.getByRole('link',{name:'Área dos noivos'}).click();await expect(dialog.getByText('O painel privado está disponível',{exact:false})).toBeVisible();
  await dialog.getByRole('button',{name:'Fechar janela'}).click();
  expect(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.src.startsWith('data:')))).toBe(true);
  expect(requests).toEqual([]);expect(errors).toEqual([]);
});
