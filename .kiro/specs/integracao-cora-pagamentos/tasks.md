# Implementation Plan: Integração Cora Pagamentos

## Overview

Implementação da integração com a API da Cora Pagamentos no sistema Bora Gerir, permitindo emissão de boletos, carnês, cobranças Pix, transferências e baixa automática via webhooks. A implementação segue a arquitetura definida no design: lib layer para lógica core, API routes para endpoints, e componentes React para UI.

## Tasks

- [x] 1. Infraestrutura base
  - [x] 1.1 Criar migration SQL para tabelas Cora
    - Criar arquivo `supabase/migrations/20250126_cora_integration.sql`
    - Tabelas: `cora_contas`, `cora_boletos`, `cora_transacoes`, `cora_audit_log`
    - Incluir índices, RLS policies e constraints conforme design
    - _Requirements: 1.2, 1.7, 2.2, 3.2, 8.2, 11.8, 12.1, 12.4_

  - [x] 1.2 Criar lib/cora/types.ts
    - Definir todos os types/interfaces: CoraInvoiceRequest, CoraInvoiceResponse, CoraBuyer, CoraAddress, CoraService, CoraPaymentTerms, CoraFine, CoraDiscount, CoraNotification, CoraBankslip, CoraPix, CoraPayment, CoraTransferRequest, CoraTransferResponse, CoraTransferDestination, CoraWebhookPayload, CoraWebhookEndpointRequest, CoraWebhookEndpointResponse, CoraStatementEntry, CoraStatementResponse, CoraTokenResponse
    - Definir tipos de status: CoraInvoiceStatus, CoraTransferStatus
    - _Requirements: 2.1, 6.1, 8.1_

  - [x] 1.3 Criar lib/cora/crypto.ts
    - Implementar `encrypt(plaintext, key)` usando AES-256-GCM
    - Implementar `decrypt(ciphertext, key)` usando AES-256-GCM
    - Formato de saída: `iv:tag:ciphertext` em hex
    - Usar chave de env var `CORA_ENCRYPTION_KEY` (32 bytes hex)
    - _Requirements: 1.7, 12.1_

  - [ ]* 1.4 Write property test para crypto round-trip
    - **Property 1: Encryption Round-Trip**
    - Para qualquer string arbitrária e chave válida AES-256, encrypt → decrypt produz a string original
    - **Validates: Requirements 1.7, 12.1**

  - [x] 1.5 Criar lib/cora/tokens.ts
    - Implementar `getValidToken(empresaId)`: busca conta, verifica expiração (margem 5min), renova se necessário
    - Implementar `refreshToken(conta)`: chama Cora OAuth, atualiza tokens criptografados no banco
    - Implementar `storeTokens(empresaId, tokens, coraAccountId)`: upsert cora_contas
    - Implementar `revokeTokens(empresaId)`: limpa tokens e marca status desconectado
    - _Requirements: 1.2, 1.4, 1.5, 1.6_

  - [x] 1.6 Criar lib/cora/client.ts
    - Implementar classe `CoraClient` com constructor(empresaId)
    - Método privado `request<T>(path, options)`: obtém token via getValidToken, faz fetch com headers (Authorization, Idempotency-Key, Content-Type)
    - Métodos: createInvoice, getInvoice, cancelInvoice, createTransfer, listTransfers, getStatement, registerWebhook, deleteWebhook
    - Criar classe `CoraApiError` para erros tipados
    - _Requirements: 2.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 1.7 Criar lib/cora/middleware.ts
    - Implementar `validateCoraAccess(request)`: valida sessão Supabase, obtém empresa, verifica plano "profissional"
    - Retorna `{ empresaId, userId }` ou `NextResponse` com erro 401/403
    - _Requirements: 1.3, 13.1, 13.3_

  - [ ]* 1.8 Write property test para Plan Access Control Gate
    - **Property 9: Plan Access Control Gate**
    - Para qualquer empresa sem plano "profissional", o middleware rejeita com 403 sem executar lógica
    - **Validates: Requirements 13.1**

- [x] 2. OAuth2 e Configuração
  - [x] 2.1 Criar app/api/cora/auth/route.ts
    - GET handler: valida plano via middleware, gera state, redireciona para Cora OAuth authorize URL com scopes
    - Parâmetros OAuth: client_id, redirect_uri, response_type=code, scope, state
    - _Requirements: 1.1_

  - [x] 2.2 Criar app/api/cora/callback/route.ts
    - GET handler: recebe `code` e `state`, valida state, troca code por tokens via POST /oauth/token
    - Armazena tokens criptografados via `storeTokens()`
    - Registra webhooks na Cora via `CoraClient.registerWebhook()`
    - Redireciona para /configuracoes com status sucesso
    - _Requirements: 1.2, 11.1_

  - [x] 2.3 Criar app/api/cora/disconnect/route.ts
    - POST handler: valida acesso, revoga tokens na Cora (se possível), chama `revokeTokens()`
    - Registra operação em cora_audit_log
    - _Requirements: 1.6, 12.4_

  - [x] 2.4 Criar components/cora/cora-config.tsx
    - Componente React para aba Configurações
    - Estado "desconectado": botão "Conectar Cora" (chama /api/cora/auth)
    - Estado "ativo": exibe conta vinculada + botão "Desconectar"
    - Estado "erro": exibe banner de reconexão necessária + botão "Reconectar"
    - Verificação de plano: se não profissional, exibe CTA de upgrade
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 2.5 Integrar cora-config na página de Configurações
    - Adicionar aba/seção "Cora Pagamentos" na página /configuracoes
    - Renderizar componente `CoraConfig`
    - _Requirements: 1.1_

- [x] 3. Checkpoint - Infraestrutura e OAuth
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Boletos e Carnês
  - [x] 4.1 Criar app/api/cora/boletos/route.ts (POST + GET)
    - POST: valida acesso, valida dados (pagador, valor > 0, data futura), monta CoraInvoiceRequest, chama CoraClient.createInvoice, salva em cora_boletos, registra audit log
    - GET: valida acesso, lista boletos da empresa com filtros (status, período, nome cliente), paginação
    - Conversão reais → centavos no envio, centavos → reais no retorno
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3_

  - [ ]* 4.2 Write property test para Boleto Validation e Filter
    - **Property 8: Boleto Validation Rejects Incomplete Data**
    - Para qualquer request com campo obrigatório ausente, a emissão é rejeitada enumerando campos faltantes
    - **Validates: Requirements 2.3**
    - **Property 4: Boleto Filter Correctness**
    - Para qualquer conjunto de boletos e combinação de filtros, todos resultados atendem aos critérios e nenhum boleto válido é excluído
    - **Validates: Requirements 4.3**

  - [x] 4.3 Criar app/api/cora/boletos/[id]/route.ts (GET)
    - GET: valida acesso, busca boleto por ID (pertencente à empresa), retorna detalhes completos
    - _Requirements: 4.4_

  - [x] 4.4 Criar app/api/cora/boletos/[id]/cancelar/route.ts (POST)
    - POST: valida acesso, verifica status (só aberto/vencido), chama CoraClient.cancelInvoice, atualiza status local, registra audit log
    - Rejeita se status = "pago"
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.5 Criar app/api/cora/boletos/carne/route.ts (POST)
    - POST: valida acesso, valida parcelas (2-48), calcula valores por parcela (centavos, ajuste de arredondamento na 1ª), calcula datas sequenciais mensais
    - Emite cada boleto individualmente, rollback se algum falhar
    - Salva todos com carne_id e numero_parcela
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.6 Write property tests para Carnê
    - **Property 2: Carnê Value Splitting Invariant**
    - Para qualquer valor total e número de parcelas (2-48), a soma dos valores das parcelas é igual ao total
    - **Validates: Requirements 3.1**
    - **Property 3: Carnê Date Sequence**
    - Para qualquer data inicial e número de parcelas, as datas formam sequência mensal estritamente crescente
    - **Validates: Requirements 3.4**

  - [x] 4.7 Criar components/cora/cora-emitir-boleto.tsx
    - Modal/formulário para emissão de boleto individual
    - Campos: dados do pagador (nome, CPF/CNPJ, endereço), valor, data vencimento, descrição serviço
    - Validação client-side + exibição de erros da API traduzidos
    - Exibe resultado (código barras, linha digitável, link PDF, QR Pix) após sucesso
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.8 Criar components/cora/cora-emitir-carne.tsx
    - Modal/formulário para emissão de carnê
    - Campos: dados do pagador, valor total, número de parcelas (2-48), data primeiro vencimento
    - Preview das parcelas calculadas antes de confirmar
    - _Requirements: 3.1, 3.3_

  - [x] 4.9 Criar components/cora/cora-status-badge.tsx
    - Badge colorido para status de boleto/transferência
    - Cores: aberto=amarelo, pago=verde, vencido=vermelho, cancelado=cinza
    - _Requirements: 4.1, 4.2_

- [x] 5. Pix e Extrato
  - [x] 5.1 Criar app/api/cora/pix/route.ts (POST)
    - POST: valida acesso, valida valor > 0, gera cobrança Pix via CoraClient, salva em cora_boletos com tipo="pix"
    - Retorna QR Code (base64) e código copia-e-cola
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Criar app/api/cora/extrato/route.ts (GET)
    - GET: valida acesso, recebe parâmetros startDate/endDate, consulta CoraClient.getStatement
    - Retorna entradas com saldo atual no topo
    - Filtragem por período
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 5.3 Write property test para Extrato Date Range Filter
    - **Property 11: Extrato Date Range Filter**
    - Para qualquer filtro de período, todas entradas retornadas estão dentro do range e nenhuma dentro do range é excluída
    - **Validates: Requirements 7.3**

  - [x] 5.4 Criar components/cora/cora-extrato.tsx
    - Componente de visualização do extrato
    - Saldo atual no topo, lista de transações com data/tipo/descrição/valor/saldo
    - Filtro por período (date picker)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Transferências
  - [x] 6.1 Criar app/api/cora/transferencias/route.ts (POST + GET)
    - POST: valida acesso, valida dados destino (banco, agência, conta, tipo, documento, nome), valor, envia via CoraClient.createTransfer, salva em cora_transacoes
    - GET: valida acesso, lista transferências da empresa com status atualizado
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 6.2 Criar components/cora/cora-transferir.tsx
    - Modal de transferência com campos: banco, agência, conta, tipo (corrente/poupança), CPF/CNPJ, nome titular, valor, descrição
    - Validação client-side, exibição de confirmação e status
    - _Requirements: 8.1, 8.2_

- [x] 7. Checkpoint - Boletos, Pix, Extrato e Transferências
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Aba Cobranças no Financeiro
  - [x] 8.1 Criar components/cora/cora-cobrancas-tab.tsx
    - Sub-aba completa "Cobranças" com:
    - Listagem de boletos/Pix com status badges
    - Filtros: status (aberto, pago, vencido, cancelado), período, nome cliente
    - Ações: ver detalhes, cancelar, emitir novo boleto, emitir carnê, gerar Pix
    - Paginação
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

  - [x] 8.2 Integrar sub-aba "Cobranças" no financeiro-client.tsx
    - Adicionar tab "Cobranças" no componente financeiro existente
    - Renderizar `CoraCobrancasTab` condicionalmente (só se empresa tem conta Cora ativa)
    - _Requirements: 4.1_

- [x] 9. Webhooks
  - [x] 9.1 Criar app/api/cora/webhook/route.ts
    - POST handler: valida CORA_WEBHOOK_SECRET no header Authorization
    - Parse do payload: identifica resource (invoice/transfer) e trigger (paid/overdue/canceled/completed)
    - Idempotência: verifica se boleto/transação já está no status target
    - Atualiza status em cora_boletos ou cora_transacoes conforme trigger
    - Para trigger "paid": atualiza data_pagamento
    - Retorna 200 se processado ou duplicata, 401 se auth inválida, 500 se erro (para Cora reenviar)
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 9.2 Implementar baixa automática em vendas e parcelas
    - Quando boleto pago via webhook e tem venda_id: marcar venda como paga
    - Quando boleto pago via webhook e tem parcela_id: dar baixa na parcela do contrato
    - _Requirements: 9.4, 10.3_

  - [ ]* 9.3 Write property tests para Webhook
    - **Property 6: Webhook Idempotence**
    - Processar o mesmo payload N vezes produz o mesmo estado final que processar 1 vez
    - **Validates: Requirements 11.8**
    - **Property 7: Webhook Authentication Rejection**
    - Requests sem CORA_WEBHOOK_SECRET válido recebem 401 sem modificar banco
    - **Validates: Requirements 11.6**
    - **Property 10: Webhook State Transitions**
    - Para triggers paid/overdue/canceled, o status do boleto é mapeado corretamente
    - **Validates: Requirements 11.2, 11.3, 11.4**

- [x] 10. Integração no PDV (Venda)
  - [x] 10.1 Adicionar "Boleto Cora" e "Pix Cora" como formas de pagamento no venda-client.tsx
    - Exibir opções apenas se empresa tem Conta_Cora ativa
    - Ocultar se não tem conta vinculada
    - _Requirements: 9.1, 9.5_

  - [x] 10.2 Emitir cobrança automaticamente ao finalizar venda
    - Boleto Cora: ao finalizar venda, chamar /api/cora/boletos com dados do cliente e valor da venda, vincular venda_id
    - Pix Cora: ao finalizar venda, chamar /api/cora/pix com valor da venda, exibir QR Code, vincular venda_id
    - _Requirements: 9.2, 9.3_

- [x] 11. Integração em Contratos
  - [x] 11.1 Adicionar opção "Gerar carnê Cora" ao criar contrato
    - Checkbox/toggle na tela de criação de contrato (visível apenas com Conta_Cora ativa)
    - _Requirements: 10.1_

  - [x] 11.2 Gerar carnê via API ao criar contrato com opção marcada
    - Após criar contrato, se opção marcada: chamar /api/cora/boletos/carne com dados do cliente, parcelas do contrato
    - Vincular contrato_id e parcela_id em cada boleto gerado
    - Tratar falha: manter contrato criado, notificar para emissão manual
    - _Requirements: 10.2, 10.5_

  - [x] 11.3 Cancelar boletos pendentes ao cancelar contrato
    - Ao cancelar contrato: buscar boletos com contrato_id e status aberto/vencido, cancelar cada um via API
    - Boletos pagos permanecem inalterados
    - _Requirements: 10.4_

  - [ ]* 11.4 Write property test para Contract Cancellation Cascade
    - **Property 5: Contract Cancellation Cascade**
    - Para qualquer contrato com N boletos em status misto, cancelamento cancela apenas abertos/vencidos, pagos ficam inalterados
    - **Validates: Requirements 10.4**

- [x] 12. Audit Logging
  - [x] 12.1 Implementar helper de audit log e integrar em todas as operações financeiras
    - Criar helper `logCoraAudit(empresaId, userId, operacao, detalhes)` em lib/cora/audit.ts
    - Integrar em: emissão boleto, cancelamento boleto, geração Pix, solicitação transferência, conexão/desconexão
    - _Requirements: 12.4_

  - [ ]* 12.2 Write property test para Audit Logging Completeness
    - **Property 12: Audit Logging Completeness**
    - Para qualquer operação financeira, um registro de auditoria é criado com empresa_id, user_id, operação e timestamp
    - **Validates: Requirements 12.4**

- [x] 13. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using `fast-check`
- Unit tests validate specific examples and edge cases using `vitest`
- Valores monetários: converter reais → centavos ao enviar para Cora, centavos → reais ao receber
- A API da Cora não tem endpoint batch para carnês; emitir boletos individualmente com rollback em falha
- Middleware de validação de plano deve ser aplicado em todas as rotas exceto webhook

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.7"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.8"] },
    { "id": 3, "tasks": ["1.6"] },
    { "id": 4, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 5, "tasks": ["2.4", "2.5"] },
    { "id": 6, "tasks": ["4.1", "4.3", "4.4", "4.5", "5.1", "5.2", "6.1"] },
    { "id": 7, "tasks": ["4.2", "4.6", "4.7", "4.8", "4.9", "5.3", "5.4", "6.2"] },
    { "id": 8, "tasks": ["8.1", "8.2"] },
    { "id": 9, "tasks": ["9.1", "9.2"] },
    { "id": 10, "tasks": ["9.3", "12.1"] },
    { "id": 11, "tasks": ["10.1", "10.2", "12.2"] },
    { "id": 12, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 13, "tasks": ["11.4"] }
  ]
}
```
