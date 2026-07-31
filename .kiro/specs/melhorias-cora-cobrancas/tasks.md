# Implementation Plan: Melhorias Cora Cobranças

## Overview

Implementação incremental das melhorias na integração Cora Pagamentos: (1) Pix Online e Boleto no PDV, (2) Toggle boleto/carnê e entrada em contratos, (3) Gerar boleto em Valores a Receber, (4) Página de Boletos, (5) Reconciliação webhook estendida, (6) Restrição de acesso por plano.

## Tasks

- [x] 1. Migrations de banco de dados e interfaces base
  - [x] 1.1 Criar migration SQL para alterações no schema
    - Adicionar constraint de status `pendente_boleto` na tabela `vendas`
    - Adicionar coluna `valor_receber_id` (UUID, FK) na tabela `cora_boletos` com índice
    - Adicionar coluna `cora_boleto_id` (UUID, FK) na tabela `valores_receber`
    - Adicionar colunas `tipo_cobranca`, `entrada_valor`, `entrada_forma_pagamento` na tabela `contratos`
    - Arquivo: `supabase/migrations/YYYYMMDD_melhorias_cora_cobrancas.sql`
    - _Requirements: 2.2, 4.1, 6.3_

  - [x] 1.2 Atualizar types TypeScript do Supabase para refletir schema atualizado
    - Atualizar interfaces em `lib/cora/types.ts` se necessário (adicionar `valor_receber_id` nos types de boleto)
    - Criar/atualizar types para os novos campos de contratos (`tipo_cobranca`, `entrada_valor`, `entrada_forma_pagamento`)
    - _Requirements: 2.2, 4.1, 6.3_

- [x] 2. Endpoint de polling Pix e componente PixOnlinePanel
  - [x] 2.1 Criar endpoint `/api/cora/pix/status` (GET)
    - Recebe query param `boletoId`
    - Consulta apenas o banco local (SELECT status, data_pagamento FROM cora_boletos WHERE id = boletoId)
    - Retorna `{ status: "aberto" | "pago" | "vencido" | "cancelado", dataPagamento?: string }`
    - Verificar que empresa do boleto corresponde ao usuário autenticado
    - Arquivo: `app/api/cora/pix/status/route.ts`
    - _Requirements: 1.2, 8.1_

  - [ ]* 2.2 Write property test para endpoint pix/status (Property 8)
    - **Property 8: Polling retorna apenas estado local**
    - **Validates: Requirements 1.2**
    - Verificar que para qualquer boletoId, a resposta reflete o status do banco local sem chamadas externas

  - [x] 2.3 Criar componente `PixOnlinePanel`
    - Exibir QR Code (imagem ou SVG) e código copia-e-cola
    - Indicador visual "Aguardando pagamento..." com animação
    - Polling a cada 5 segundos via `setInterval` + fetch ao `/api/cora/pix/status`
    - Ao detectar status "pago": callback `onPaid()` para finalizar venda
    - Botão "Cancelar" que chama DELETE na cobrança Pix via API existente
    - Timeout de 5 minutos com alerta e opções (continuar/cancelar)
    - Arquivo: `components/venda/pix-online-panel.tsx`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7_

- [x] 3. Fluxo Pix Online no PDV (venda-client)
  - [x] 3.1 Modificar `venda-client.tsx` para adicionar opção "Pix Online"
    - Adicionar botão "Pix Online" na seção de formas de pagamento (visível apenas se empresa tem plano profissional + conta Cora ativa)
    - Ao selecionar: chamar POST `/api/cora/pix` com dados do pagador e valor
    - Exibir `PixOnlinePanel` com QR Code retornado
    - Ao receber `onPaid()`: finalizar venda com status "concluida" e exibir modal de sucesso
    - Ao cancelar: chamar API de cancelamento e retornar à seleção de pagamento
    - Tratar erro na geração: toast de erro + permitir escolher outra forma
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 8.1, 8.4_

- [x] 4. Checkpoint - Verificar fluxo Pix Online
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Fluxo Boleto no PDV
  - [x] 5.1 Criar componente `BoletoResultModal`
    - Exibir código de barras, linha digitável, link PDF, QR Code Pix do boleto
    - Botão "Enviar via WhatsApp" que abre link wa.me com mensagem formatada
    - Arquivo: `components/venda/boleto-result-modal.tsx`
    - _Requirements: 2.4_

  - [x] 5.2 Modificar `venda-client.tsx` para adicionar opção "Boleto"
    - Adicionar botão "Boleto" na seção de formas de pagamento (visível apenas com plano profissional + conta Cora ativa)
    - Exibir campo de data de vencimento (padrão: 3 dias úteis)
    - Ao finalizar: INSERT venda com status `pendente_boleto` (NÃO criar movimentação no caixa)
    - Chamar POST `/api/cora/boletos` com vendaId e dados
    - Exibir `BoletoResultModal` com dados retornados
    - Se emissão falhar: DELETE da venda recém-criada, restaurar estado do PDV, exibir erro
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.4_

  - [ ]* 5.3 Write property test para venda pendente_boleto sem movimentação (Property 1)
    - **Property 1: Venda pendente_boleto não gera movimentação no caixa**
    - **Validates: Requirements 2.2**

- [x] 6. Estender webhook handler para reconciliação completa
  - [x] 6.1 Estender `processPaymentReconciliation` em `app/api/cora/webhook/route.ts`
    - Quando boleto tem `venda_id` e venda tem status `pendente_boleto`: atualizar venda para "concluida" + criar movimentação de entrada no caixa (buscar caixa aberto ou usar último fechado com flag `reconciliacao_webhook`)
    - Quando boleto tem `valor_receber_id`: atualizar `valores_receber` para status "recebido" + criar movimentação no caixa
    - Adicionar tratamento do trigger `invoice.overdue`: atualizar status do boleto para "vencido"
    - Manter idempotência: se já no status alvo, retornar 200 sem modificar
    - Se falhar: retornar 500 para Cora reenviar
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.2 Write property test para webhook paid → venda concluida + caixa (Property 2)
    - **Property 2: Webhook paid cria movimentação e atualiza venda**
    - **Validates: Requirements 2.3, 7.1**

  - [ ]* 6.3 Write property test para webhook paid → valor_receber recebido (Property 3)
    - **Property 3: Webhook paid em valor_receber atualiza status**
    - **Validates: Requirements 6.4, 7.3**

- [x] 7. Checkpoint - Verificar fluxo Boleto e Webhook
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Toggle Boleto/Carnê e Entrada em Contratos
  - [x] 8.1 Modificar `components/contratos/contratos-client.tsx` — formulário de criação
    - Adicionar toggle "Gerar Boletos" / "Gerar Carnê" (visível apenas com plano profissional + conta Cora ativa)
    - Adicionar checkbox "Receber Entrada" com campos: valor da entrada e forma de pagamento (Dinheiro, Pix, Cartão Débito, Cartão Crédito)
    - Validar: se caixa não aberto e entrada ativa → bloquear e exibir mensagem
    - Validar: se valor entrada ≠ valor 1ª parcela → exibir alerta de diferença com confirmação
    - Ao confirmar criação com entrada: marcar 1ª parcela como "pago" + criar movimentação no caixa
    - Gerar boletos/carnê apenas para parcelas 2..N
    - Tratar falha parcial: informar quais parcelas tiveram sucesso/falha, permitir retentar
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.2, 8.4_

  - [ ]* 8.2 Write property test para entrada exclui 1ª parcela (Property 5)
    - **Property 5: Contrato com entrada exclui primeira parcela dos boletos**
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 8.3 Write property test para carnê preserva valor total (Property 6)
    - **Property 6: Carnê split preserva valor total**
    - **Validates: Requirements 4.3**

  - [x] 8.4 Adicionar exibição de status de boletos na visualização do contrato
    - Na visualização de contrato existente, mostrar status de cada boleto/parcela (aberto, pago, vencido, cancelado)
    - Buscar dados de `cora_boletos` vinculados às parcelas do contrato
    - _Requirements: 4.5_

- [x] 9. Gerar Boleto em Valores a Receber
  - [x] 9.1 Criar componente `GerarBoletoModal`
    - Modal com campos pré-preenchidos: valor, descrição, data vencimento
    - Campos para dados do pagador: nome, CPF/CNPJ, email, endereço
    - Botão confirmar que chama POST `/api/cora/boletos` com `valorReceberId`
    - Tratar erro: exibir mensagem sem alterar valor_receber
    - Arquivo: `components/financeiro/gerar-boleto-modal.tsx`
    - _Requirements: 6.2, 6.3_

  - [x] 9.2 Modificar `components/financeiro/financeiro-client.tsx` — seção Valores a Receber
    - Adicionar botão "Gerar Boleto" ao lado de cada valor a receber com status "pendente"
    - Se valor já tem boleto vinculado com status "aberto": exibir status do boleto em vez do botão
    - Se empresa não tem conta Cora ativa: ocultar botão com tooltip explicativo
    - Se empresa não tem plano profissional: ocultar botão
    - Ao clicar: abrir `GerarBoletoModal` com dados pré-preenchidos
    - _Requirements: 6.1, 6.5, 6.6, 8.3, 8.4_

- [x] 10. Checkpoint - Verificar Contratos e Valores a Receber
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Página de Boletos
  - [x] 11.1 Criar página e componente da Página de Boletos
    - Criar `app/(app)/boletos/page.tsx` (server component que busca dados)
    - Criar `components/cora/boletos-page.tsx` (client component)
    - Cards de resumo no topo: total em aberto, total vencido, total pago no mês, quantidade emitidos no mês
    - Lista de boletos com colunas: cliente, valor, vencimento, status (aberto/pago/vencido/cancelado), origem (venda/contrato/avulso)
    - Filtros: status, período de vencimento, nome do cliente
    - Detalhe do boleto: código de barras, linha digitável, QR Code Pix, link PDF, histórico de status
    - Ação "Cancelar": chamar POST `/api/cora/boletos/cancelar` (apenas para boletos aberto/vencido)
    - Ação "Reenviar": abrir link WhatsApp com dados do boleto
    - Acesso restrito: apenas plano profissional + conta Cora ativa
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.5_

  - [x] 11.2 Criar endpoint `/api/cora/boletos/cancelar` (POST)
    - Recebe `{ boletoId }` no body
    - Valida status é "aberto" ou "vencido"
    - Chama `coraClient.cancelInvoice(cora_invoice_id)`
    - UPDATE cora_boletos SET status=cancelado, data_cancelamento=now()
    - Registrar audit log
    - Retornar erro se status não permite cancelamento
    - Arquivo: `app/api/cora/boletos/cancelar/route.ts`
    - _Requirements: 3.4_

  - [ ]* 11.3 Write property test para cancelamento idempotente (Property 7)
    - **Property 7: Cancelamento de boleto é idempotente**
    - **Validates: Requirements 3.4**

  - [ ]* 11.4 Write property test para filtro de boletos (Property 4)
    - **Property 4: Filtro de boletos retorna resultados corretos**
    - **Validates: Requirements 3.2**

- [x] 12. Menu lateral e Restrição de Plano
  - [x] 12.1 Adicionar item "Boletos" no menu lateral
    - Modificar `components/layout/mobile-nav.tsx` e/ou `components/layout/topbar.tsx`
    - Adicionar link "Boletos" com ícone, posicionado abaixo de "Débitos"
    - Visível apenas para plano profissional + conta Cora ativa
    - _Requirements: 3.7, 8.5_

  - [x] 12.2 Implementar middleware/guard de restrição de plano nos endpoints Cora
    - Verificar que endpoints de emissão (pix, boletos, cancelar) retornam 403 se empresa sem plano profissional
    - Verificar que endpoints retornam 403 se empresa sem conta Cora ativa
    - Reusar middleware existente em `lib/cora/middleware.ts` se aplicável
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 12.3 Write property test para restrição de plano (Property 9)
    - **Property 9: Restrição de plano bloqueia operações Cora**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5**

- [x] 13. Final checkpoint - Verificar integração completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- A stack é Next.js (App Router) + Supabase + Tailwind v4 + TypeScript
- Os componentes Cora existentes em `lib/cora/*` e `components/cora/*` devem ser reutilizados
- O webhook handler existente em `app/api/cora/webhook/route.ts` já tem estrutura de reconciliação — estender, não reescrever
- Consultar `node_modules/next/dist/docs/` antes de escrever código Next.js (conforme regra do AGENTS.md)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "5.1", "9.1", "11.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "5.2", "6.1", "12.2"] },
    { "id": 3, "tasks": ["3.1", "5.3", "6.2", "6.3", "9.2", "12.3"] },
    { "id": 4, "tasks": ["8.1", "11.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4", "11.3", "11.4", "12.1"] }
  ]
}
```
