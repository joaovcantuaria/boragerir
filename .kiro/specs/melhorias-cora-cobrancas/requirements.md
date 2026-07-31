# Requirements Document

## Introduction

Este documento define os requisitos para melhorias na integração Cora Pagamentos do sistema Bora Gerir. As melhorias abrangem três áreas: (1) adição de Pix Online com detecção em tempo real e Boleto com controle de saldo no PDV; (2) melhorias no módulo de Contratos com opção boleto/carnê e entrada; (3) geração de boletos em Valores a Receber no Financeiro. Uma nova página de Boletos também será criada para gestão centralizada.

## Glossary

- **PDV**: Ponto de Venda — tela de Nova Venda (`/venda`) onde operadores registram vendas
- **Cora_API**: API v2 da Cora Pagamentos usada para emissão de boletos, cobranças Pix e consultas
- **Webhook_Handler**: Endpoint `/api/cora/webhook` que recebe notificações da Cora sobre mudanças de status de cobranças
- **Caixa**: Registro financeiro diário da empresa com saldo em espécie e movimentações
- **Boleto_Registrado**: Cobrança bancária registrada via Cora com código de barras, linha digitável e QR Code Pix
- **Pix_Online**: Cobrança Pix com QR Code exibido na tela de venda e detecção automática de pagamento
- **Carnê**: Conjunto de boletos sequenciais gerados a partir de um contrato, com numeração e vencimentos definidos
- **Entrada**: Pagamento parcial realizado no ato da criação do contrato, debitando a primeira parcela
- **Valores_a_Receber**: Seção do módulo Financeiro onde a empresa registra receitas futuras esperadas
- **Polling**: Verificação periódica do status de uma cobrança via requisições à API
- **Invoice**: Termo da API Cora que representa uma cobrança (boleto ou Pix)
- **Empresa**: Negócio cadastrado no Bora Gerir que utiliza o sistema (não o cliente final)
- **Plano_Profissional**: Plano de assinatura do Bora Gerir que habilita recursos Cora (R$99/mês)

## Requirements

### Requirement 1: Pix Online no PDV com Detecção em Tempo Real

**User Story:** Como operador do PDV, quero selecionar "Pix Online" como forma de pagamento e visualizar o QR Code diretamente na tela de venda, para que o cliente pague na hora e a venda seja concluída automaticamente ao detectar o pagamento.

#### Acceptance Criteria

1. WHEN o operador seleciona "Pix Online" como forma de pagamento no PDV, THE PDV SHALL exibir um QR Code e o código copia-e-cola na área de pagamento da tela de venda, sem finalizar a venda.
2. WHILE o QR Code está exibido na tela de venda, THE PDV SHALL consultar o status da cobrança a cada 5 segundos via polling ao endpoint `/api/cora/pix/status`.
3. WHEN o Webhook_Handler recebe confirmação de pagamento da cobrança Pix, THE Webhook_Handler SHALL atualizar o status do registro `cora_boletos` para "pago" e registrar a data de pagamento.
4. WHEN o polling detecta que a cobrança Pix foi paga, THE PDV SHALL finalizar a venda automaticamente com status "concluida" e exibir o modal de sucesso.
5. WHEN o operador cancela a operação Pix antes do pagamento, THE PDV SHALL cancelar a cobrança na Cora_API e retornar ao estado normal de seleção de pagamento.
6. IF a geração do QR Code falhar por erro na Cora_API, THEN THE PDV SHALL exibir mensagem de erro e permitir ao operador escolher outra forma de pagamento.
7. WHILE o QR Code está sendo exibido, THE PDV SHALL mostrar um indicador visual de "Aguardando pagamento..." com animação de carregamento.

---

### Requirement 2: Boleto no PDV sem Impacto no Saldo do Caixa

**User Story:** Como operador do PDV, quero selecionar "Boleto" como forma de pagamento e gerar um boleto registrado ao finalizar a venda, para que o valor só conte no caixa após confirmação de pagamento real.

#### Acceptance Criteria

1. WHEN o operador seleciona "Boleto" como forma de pagamento e finaliza a venda, THE PDV SHALL gerar um Boleto_Registrado via Cora_API vinculado à venda.
2. WHEN uma venda com forma de pagamento "Boleto" é finalizada, THE PDV SHALL registrar a venda com status "pendente_boleto" e NÃO criar movimentação de entrada no Caixa.
3. WHEN o Webhook_Handler recebe confirmação de pagamento do boleto vinculado a uma venda, THE Webhook_Handler SHALL atualizar o status da venda para "concluida" e criar a movimentação de entrada correspondente no Caixa.
4. THE PDV SHALL exibir no modal de sucesso da venda com boleto: código de barras, linha digitável, link para PDF do boleto e opção de enviar via WhatsApp.
5. IF a geração do boleto falhar por erro na Cora_API, THEN THE PDV SHALL exibir mensagem de erro e permitir ao operador escolher outra forma de pagamento sem perder os itens da venda.
6. WHEN o operador seleciona "Boleto" no PDV, THE PDV SHALL exibir campo de data de vencimento com valor padrão de 3 dias úteis a partir da data atual.

---

### Requirement 3: Página de Boletos

**User Story:** Como proprietário da empresa, quero uma página dedicada para listar e gerenciar todos os boletos emitidos, para que eu acompanhe os status de pagamento de forma centralizada.

#### Acceptance Criteria

1. THE Página_Boletos SHALL listar todos os boletos emitidos pela empresa, exibindo: cliente, valor, data de vencimento, status (aberto, pago, vencido, cancelado) e origem (venda, contrato, avulso).
2. THE Página_Boletos SHALL permitir filtrar boletos por status, período de vencimento e nome do cliente.
3. WHEN o proprietário clica em um boleto da lista, THE Página_Boletos SHALL exibir detalhes completos incluindo código de barras, linha digitável, QR Code Pix, link do PDF e histórico de status.
4. WHEN o proprietário clica em "Cancelar" em um boleto com status "aberto" ou "vencido", THE Página_Boletos SHALL cancelar a cobrança na Cora_API e atualizar o status local para "cancelado".
5. WHEN o proprietário clica em "Reenviar" em um boleto com status "aberto", THE Página_Boletos SHALL enviar o link do boleto via WhatsApp para o cliente associado.
6. THE Página_Boletos SHALL exibir cards de resumo no topo com: total em aberto, total vencido, total pago no mês e quantidade de boletos emitidos no mês.
7. THE Página_Boletos SHALL ser acessível via menu lateral com ícone e label "Boletos", posicionada abaixo de "Débitos".

---

### Requirement 4: Toggle Boleto/Carnê na Criação de Contrato

**User Story:** Como proprietário da empresa, quero escolher entre gerar boletos individuais ou um carnê ao criar um contrato, para que as cobranças reflitam a forma de pagamento acordada com o cliente.

#### Acceptance Criteria

1. WHEN o proprietário abre o formulário de criação de contrato, THE Formulário_Contrato SHALL exibir um toggle com as opções "Gerar Boletos" (individuais) e "Gerar Carnê" (carnê agrupado).
2. WHEN o proprietário seleciona "Gerar Boletos" e confirma a criação, THE Sistema SHALL gerar um Boleto_Registrado individual via Cora_API para cada parcela do contrato, respeitando a duração em meses, dia de vencimento e data de início.
3. WHEN o proprietário seleciona "Gerar Carnê" e confirma a criação, THE Sistema SHALL gerar um Carnê via Cora_API contendo todos os boletos do contrato com numeração sequencial e mesmo `carne_id`.
4. IF a geração de boletos ou carnê falhar parcialmente durante a criação do contrato, THEN THE Sistema SHALL informar quais parcelas tiveram boletos gerados com sucesso e quais falharam, permitindo retentar apenas as que falharam.
5. WHILE o contrato possuir boletos vinculados, THE Formulário_Contrato SHALL exibir o status dos boletos de cada parcela (aberto, pago, vencido, cancelado) na visualização do contrato.

---

### Requirement 5: Entrada (Pagamento Inicial) no Contrato

**User Story:** Como proprietário da empresa, quero registrar uma entrada (pagamento antecipado) no ato da criação do contrato, para que o primeiro pagamento seja refletido imediatamente no caixa.

#### Acceptance Criteria

1. WHEN o proprietário ativa a opção "Receber Entrada" no formulário de criação de contrato, THE Formulário_Contrato SHALL exibir campos para: valor da entrada e forma de pagamento (Dinheiro, Pix, Cartão Débito, Cartão Crédito).
2. WHEN o proprietário confirma a criação do contrato com entrada, THE Sistema SHALL registrar uma movimentação de entrada no Caixa com o valor e forma de pagamento informados.
3. WHEN o proprietário confirma a criação do contrato com entrada, THE Sistema SHALL marcar a primeira parcela do contrato como "pago" com data de pagamento igual à data de criação.
4. WHEN o proprietário confirma a criação do contrato com entrada, THE Sistema SHALL gerar boletos ou carnê apenas para as parcelas restantes (excluindo a primeira parcela já paga).
5. IF o valor da entrada informado for diferente do valor da primeira parcela, THEN THE Formulário_Contrato SHALL exibir alerta informando a diferença e solicitar confirmação do proprietário.
6. IF o caixa não estiver aberto no momento da criação do contrato com entrada, THEN THE Sistema SHALL impedir a confirmação e exibir mensagem solicitando que o caixa seja aberto.

---

### Requirement 6: Gerar Boleto em Valores a Receber

**User Story:** Como proprietário da empresa, quero gerar um boleto registrado para qualquer valor a receber, para que eu tenha uma cobrança formal vinculada ao recebimento esperado.

#### Acceptance Criteria

1. WHEN o proprietário visualiza um valor a receber com status "pendente", THE Seção_Valores_a_Receber SHALL exibir um botão "Gerar Boleto" ao lado do registro.
2. WHEN o proprietário clica em "Gerar Boleto" em um valor a receber, THE Sistema SHALL abrir modal com campos pré-preenchidos (valor, descrição, vencimento) e solicitar dados do pagador (nome, CPF/CNPJ, email, endereço).
3. WHEN o proprietário confirma a geração do boleto no modal, THE Sistema SHALL criar um Boleto_Registrado via Cora_API com o valor e dados informados e vincular ao registro de valor a receber.
4. WHEN o Webhook_Handler recebe confirmação de pagamento de um boleto vinculado a um valor a receber, THE Webhook_Handler SHALL atualizar o status do valor a receber para "recebido" e criar a movimentação de entrada correspondente no Caixa.
5. IF o valor a receber já possuir um boleto vinculado com status "aberto", THEN THE Seção_Valores_a_Receber SHALL exibir o status do boleto existente em vez do botão "Gerar Boleto".
6. IF a conta Cora da empresa não estiver ativa, THEN THE Seção_Valores_a_Receber SHALL ocultar o botão "Gerar Boleto" e exibir tooltip informando que é necessário conectar a conta Cora.

---

### Requirement 7: Reconciliação Automática via Webhook

**User Story:** Como proprietário da empresa, quero que pagamentos confirmados via boleto ou Pix atualizem automaticamente os registros financeiros do sistema, para que eu não precise dar baixa manual.

#### Acceptance Criteria

1. WHEN o Webhook_Handler recebe evento "invoice.paid" para um boleto vinculado a uma venda com status "pendente_boleto", THE Webhook_Handler SHALL atualizar a venda para "concluida" e criar movimentação de entrada no Caixa associado à empresa.
2. WHEN o Webhook_Handler recebe evento "invoice.paid" para um boleto vinculado a uma parcela de contrato, THE Webhook_Handler SHALL atualizar a parcela para "pago" com data de pagamento e verificar se todas as parcelas do contrato estão pagas para auto-conclusão.
3. WHEN o Webhook_Handler recebe evento "invoice.paid" para um boleto vinculado a um valor a receber, THE Webhook_Handler SHALL atualizar o valor a receber para "recebido" e criar movimentação de entrada no Caixa.
4. WHEN o Webhook_Handler recebe evento "invoice.overdue" para um boleto, THE Webhook_Handler SHALL atualizar o status do boleto para "vencido" no banco local.
5. THE Webhook_Handler SHALL processar cada evento de forma idempotente, ignorando eventos para boletos que já estejam no status alvo.
6. IF o Webhook_Handler falhar ao processar um evento, THEN THE Webhook_Handler SHALL retornar status 500 para que a Cora reenvie o webhook posteriormente.

---

### Requirement 8: Restrição de Acesso por Plano

**User Story:** Como administrador do sistema, quero que funcionalidades Cora sejam acessíveis apenas para empresas do Plano_Profissional, para que o modelo de monetização seja respeitado.

#### Acceptance Criteria

1. WHILE a empresa não possuir assinatura ativa do Plano_Profissional, THE Sistema SHALL ocultar as opções "Pix Online" e "Boleto" no PDV.
2. WHILE a empresa não possuir assinatura ativa do Plano_Profissional, THE Sistema SHALL ocultar o toggle de boleto/carnê no formulário de contrato.
3. WHILE a empresa não possuir assinatura ativa do Plano_Profissional, THE Sistema SHALL ocultar o botão "Gerar Boleto" na seção Valores a Receber.
4. WHILE a empresa não possuir conta Cora ativa (registro em `cora_contas` com status "ativo"), THE Sistema SHALL desabilitar operações de emissão e exibir mensagem orientando a conectar a conta Cora nas Configurações.
5. THE Página_Boletos SHALL ser acessível apenas para empresas com Plano_Profissional e conta Cora ativa.
