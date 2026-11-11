# Vídeo de homologação Cora — roteiro de gravação

Pedido da Cora: gravar a tela inteira (sem cortes) mostrando:
1. o sistema que o cliente final usa;
2. o fluxo de autenticação e autorização do cliente e o uso das APIs (boleto, Pix etc.);
3. como acontece a atualização (renovação) do token.

Não precisa mostrar código. Duração sugerida: 6 a 10 minutos.

---

## Antes de gravar

- [ ] Na Vercel (projeto do App), confira se `CORA_API_URL`, `CORA_CLIENT_ID`, `CORA_CLIENT_SECRET` e `CORA_REDIRECT_URI` estão apontando para o **ambiente que a Cora liberou para a homologação**. O redirect deve ser `https://app.boragerir.com/api/cora/callback`.
- [ ] Use uma empresa no **plano Profissional**.
- [ ] Se essa empresa já estiver conectada, clique em **Desconectar Cora** antes de gravar, para mostrar a conexão do zero.
- [ ] Tenha um cliente cadastrado com CPF/CNPJ, e-mail e endereço completos (a Cora exige para o boleto).
- [ ] Feche abas com senhas e chaves, desligue as notificações do Windows e deixe o navegador em tela cheia.
- [ ] Ferramenta de gravação: Win + Alt + R (Xbox Game Bar), ou OBS / Loom.

---

## Roteiro (cena por cena)

### Cena 1 — Apresentação (≈30 s)
- Abra `app.boragerir.com` e faça login.
- Fale: "Este é o BoraGerir, sistema de gestão usado pelo cliente final (pequenas empresas). A integração com a Cora fica disponível no plano Profissional."

### Cena 2 — Autenticação e autorização (≈2 min)
1. Vá em **Configurações → aba Cora**. Mostre o estado "Nenhuma conta Cora conectada".
2. Clique em **Conectar Cora**.
3. Fale: "O cliente é levado para a tela de login da própria Cora. O BoraGerir não vê nem guarda a senha do cliente."
4. Faça login na Cora e **autorize** o acesso do BoraGerir.
5. A Cora devolve para o BoraGerir e aparece "Conta Cora conectada com sucesso".
6. Fale, apontando o card: "O fluxo é OAuth 2.0 (authorization code), com proteção contra falsificação de requisição (parâmetro state). Os tokens recebidos ficam guardados criptografados no nosso banco, e cada token só serve para a empresa que autorizou."

### Cena 3 — Atualização do token (≈1 min)
- Ainda em Configurações → Cora, mostre o quadro com:
  - **Conectada em …**
  - **Acesso seguro válido até …**
  - **Última renovação …**
- Fale: "Antes de cada chamada à API da Cora, o sistema verifica a validade do token. Faltando 5 minutos ou menos para vencer, ele usa o refresh token para pedir um novo à Cora, sem o cliente precisar fazer nada. Se a renovação falhar (por exemplo, se o cliente revogou o acesso), a conta fica com o status 'Sessão expirada' e aparece o botão **Reconectar Cora**."
- Se quiser mostrar a renovação acontecendo: grave esta cena, espere o horário de "válido até" passar (ou volte depois), emita qualquer cobrança e recarregue a página. A "Última renovação" e o "válido até" mudam.

### Cena 4 — Emissão de boleto (≈2 min)
1. Vá em **Boletos** (menu) → **Emitir boleto**.
2. Escolha o cliente, valor, vencimento e descrição. Emita.
3. Mostre o boleto criado na lista: status **Aberto**, botão de **baixar o PDF** e a linha digitável.
4. Fale: "O boleto é registrado na Cora pela API de cobranças, e o cliente baixa o PDF ou copia a linha digitável."

### Cena 5 — Outros usos da API (≈2 min, mostre o que estiver liberado)
- **Carnê**: emita um carnê com 2 ou 3 parcelas.
- **Pix**: gere uma cobrança Pix e mostre o QR Code.
- **A Receber → Boleto**: em Financeiro → A Receber, clique em **Boleto** num valor a receber para mostrar a cobrança gerada a partir do financeiro.
- **Extrato** e **Transferência** (se estiverem liberados na sua conta).

### Cena 6 — Retorno automático do pagamento (≈1 min)
- Fale: "Quando a Cora avisa que o boleto foi pago (webhook), o BoraGerir marca a cobrança como paga, dá baixa no valor a receber e lança a entrada no caixa automaticamente."
- Se no ambiente de homologação der para simular o pagamento, simule e mostre o status mudando para **Pago** e o lançamento aparecendo no **Caixa**.

### Cena 7 — Cancelamento e desconexão (≈1 min)
- Cancele um boleto em aberto e mostre o status **Cancelado**.
- Em Configurações → Cora, clique em **Desconectar Cora**. Fale: "Ao desconectar, os tokens são apagados do nosso banco e o sistema para de acessar a conta."

---

## Resposta para a Cora (modelo)

> Olá, Manu! Tudo bem?
>
> Segue o vídeo da homologação, gravado em tela cheia e sem cortes: [link do Google Drive]
>
> No vídeo mostramos:
> - o BoraGerir do ponto de vista do cliente final;
> - o fluxo de autenticação e autorização (OAuth com login na própria Cora) e a emissão de boleto, carnê e Pix pela API;
> - a renovação automática do token (usamos o refresh token antes do vencimento, sem ação do cliente; em caso de falha, o cliente é avisado para reconectar);
> - o retorno dos pagamentos por webhook, com baixa automática no financeiro.
>
> O link está liberado para quem tiver o endereço. Qualquer dúvida, fico à disposição.
>
> Abraço,
> João

No Google Drive: botão direito no vídeo → Compartilhar → "Qualquer pessoa com o link" (leitor).
