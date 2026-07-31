# Requirements Document

## Introduction

Integração do sistema Bora Gerir com a API da Cora Pagamentos para permitir que empresas do plano Profissional (R$99/mês) emitam boletos registrados, carnês, cobranças Pix e realizem transferências diretamente de dentro do sistema. A integração utiliza OAuth2 com client credentials e authorization_code, onde cada empresa vincula sua própria conta Cora e recebe tokens de acesso dedicados.

## Glossary

- **Sistema**: O aplicativo Bora Gerir (BeautyFlow SaaS)
- **Empresa**: Conta de um negócio cadastrado no Bora Gerir (salão, barbearia, clínica, comércio)
- **Conta_Cora**: Conta bancária digital da empresa na Cora, vinculada via OAuth2
- **Boleto_Registrado**: Título de cobrança bancária registrado na Cora com código de barras e QR Code Pix
- **Carne**: Conjunto de boletos registrados gerados em série para cobrança parcelada
- **Cobranca_Pix**: Cobrança gerada via QR Code Pix vinculada à conta Cora da empresa
- **Webhook**: Notificação em tempo real enviada pela Cora ao Sistema quando um evento ocorre (pagamento, cancelamento)
- **Token_Acesso**: Token OAuth2 de curta duração usado para autenticar chamadas à API da Cora
- **Token_Refresh**: Token de longa duração usado para renovar o Token_Acesso sem reautenticação
- **Plano_Profissional**: Plano de assinatura do Bora Gerir (R$99/mês) que habilita funcionalidades avançadas
- **Venda**: Transação comercial registrada no PDV do Sistema
- **Contrato**: Acordo entre Empresa e cliente com parcelas de pagamento programadas
- **Extrato_Cora**: Histórico de transações (entradas e saídas) da Conta_Cora
- **Transferencia**: Operação de envio de valores da Conta_Cora para outra conta bancária

## Requirements

### Requirement 1: Vinculação de Conta Cora

**User Story:** Como proprietário de uma empresa no plano Profissional, eu quero vincular minha conta Cora ao Bora Gerir, para que eu possa emitir cobranças e gerenciar pagamentos sem sair do sistema.

#### Acceptance Criteria

1. WHEN uma Empresa do Plano_Profissional acessa Configurações e seleciona "Conectar Cora", THE Sistema SHALL iniciar o fluxo OAuth2 redirecionando para a página de autorização da Cora
2. WHEN a Cora retorna o authorization_code após consentimento do usuário, THE Sistema SHALL trocar o código por Token_Acesso e Token_Refresh e armazenar ambos criptografados na tabela cora_contas
3. WHEN uma Empresa tenta acessar a funcionalidade Cora sem estar no Plano_Profissional, THE Sistema SHALL exibir mensagem informando a necessidade de upgrade e redirecionar para a página de planos
4. WHEN o Token_Acesso está expirado e uma chamada à API Cora é necessária, THE Sistema SHALL renovar automaticamente o token usando o Token_Refresh antes de executar a chamada
5. IF o Token_Refresh está inválido ou expirado, THEN THE Sistema SHALL notificar a Empresa que a reconexão com a Cora é necessária e desabilitar funcionalidades dependentes até reconexão
6. WHEN uma Empresa seleciona "Desconectar Cora" nas Configurações, THE Sistema SHALL revogar os tokens na Cora e remover credenciais armazenadas localmente
7. THE Sistema SHALL armazenar Token_Acesso e Token_Refresh usando criptografia AES-256 no banco de dados

### Requirement 2: Emissão de Boleto Registrado

**User Story:** Como proprietário de uma empresa, eu quero emitir boletos registrados para meus clientes, para que eu possa cobrar valores de forma profissional com registro bancário.

#### Acceptance Criteria

1. WHEN uma Empresa com Conta_Cora vinculada solicita emissão de boleto informando dados do pagador, valor e data de vencimento, THE Sistema SHALL enviar requisição à API da Cora e retornar o Boleto_Registrado com código de barras, linha digitável e URL do PDF
2. WHEN um Boleto_Registrado é emitido com sucesso, THE Sistema SHALL armazenar os dados do boleto na tabela cora_boletos com referência à Empresa e ao cliente
3. WHEN os dados do pagador estão incompletos (nome, documento CPF/CNPJ ou endereço ausentes), THE Sistema SHALL rejeitar a emissão e indicar os campos obrigatórios faltantes
4. WHEN a data de vencimento informada é anterior à data atual, THE Sistema SHALL rejeitar a emissão e solicitar uma data válida
5. WHEN o valor do boleto é zero ou negativo, THE Sistema SHALL rejeitar a emissão e solicitar um valor positivo
6. WHEN um boleto é emitido, THE Sistema SHALL gerar automaticamente o QR Code Pix associado ao boleto para pagamento alternativo
7. IF a API da Cora retorna erro na emissão, THEN THE Sistema SHALL exibir mensagem de erro traduzida e registrar o erro em log para diagnóstico

### Requirement 3: Emissão de Carnê

**User Story:** Como proprietário de uma empresa, eu quero gerar carnês com múltiplos boletos de uma vez, para que eu possa cobrar parcelas de serviços ou produtos parcelados.

#### Acceptance Criteria

1. WHEN uma Empresa solicita emissão de carnê informando dados do pagador, valor total, número de parcelas e data do primeiro vencimento, THE Sistema SHALL calcular os valores por parcela e gerar os boletos em série via API da Cora
2. WHEN um carnê é gerado com sucesso, THE Sistema SHALL armazenar todos os boletos do carnê na tabela cora_boletos com campo identificando o grupo (carne_id) e número da parcela
3. WHEN o número de parcelas informado é menor que 2 ou maior que 48, THE Sistema SHALL rejeitar a emissão e informar o intervalo válido de parcelas
4. WHEN um carnê é gerado, THE Sistema SHALL calcular automaticamente as datas de vencimento sequenciais com intervalo mensal a partir da data do primeiro vencimento
5. IF algum boleto do carnê falha na emissão, THEN THE Sistema SHALL reverter os boletos já emitidos e informar a Empresa sobre a falha

### Requirement 4: Consulta de Boletos

**User Story:** Como proprietário de uma empresa, eu quero consultar os boletos emitidos com seus status atualizados, para que eu possa acompanhar as cobranças pendentes e pagas.

#### Acceptance Criteria

1. WHEN uma Empresa acessa a sub-aba "Cobranças" no Financeiro, THE Sistema SHALL listar todos os boletos emitidos pela Empresa com status atualizado (aberto, pago, vencido, cancelado)
2. WHEN a listagem de boletos é exibida, THE Sistema SHALL apresentar para cada boleto: nome do pagador, valor, data de vencimento, status e data de pagamento quando aplicável
3. WHEN uma Empresa filtra boletos por status, período ou nome do cliente, THE Sistema SHALL retornar apenas os registros correspondentes aos critérios selecionados
4. WHEN uma Empresa seleciona um boleto específico, THE Sistema SHALL exibir os detalhes completos incluindo linha digitável, link para PDF e histórico de status

### Requirement 5: Cancelamento de Boleto

**User Story:** Como proprietário de uma empresa, eu quero cancelar boletos que ainda não foram pagos, para que eu possa corrigir cobranças indevidas ou cancelar serviços.

#### Acceptance Criteria

1. WHEN uma Empresa solicita cancelamento de um boleto com status "aberto" ou "vencido", THE Sistema SHALL enviar requisição de cancelamento à API da Cora e atualizar o status local para "cancelado"
2. WHEN uma Empresa tenta cancelar um boleto com status "pago", THE Sistema SHALL rejeitar a operação e informar que boletos pagos não podem ser cancelados
3. WHEN um boleto é cancelado com sucesso, THE Sistema SHALL registrar a data e motivo do cancelamento na tabela cora_boletos
4. IF a API da Cora retorna erro no cancelamento, THEN THE Sistema SHALL manter o status anterior do boleto e exibir mensagem de erro

### Requirement 6: Cobranças via Pix

**User Story:** Como proprietário de uma empresa, eu quero gerar cobranças Pix com QR Code para meus clientes, para que eu possa receber pagamentos instantâneos.

#### Acceptance Criteria

1. WHEN uma Empresa com Conta_Cora vinculada solicita geração de Cobranca_Pix informando valor e identificação do pagador, THE Sistema SHALL gerar o QR Code via API da Cora e exibir para o cliente
2. WHEN uma Cobranca_Pix é gerada, THE Sistema SHALL armazenar os dados da cobrança na tabela cora_boletos com tipo "pix" e status correspondente
3. WHEN uma Cobranca_Pix é gerada, THE Sistema SHALL disponibilizar o código copia-e-cola e a imagem do QR Code para compartilhamento
4. WHEN o valor da cobrança Pix é zero ou negativo, THE Sistema SHALL rejeitar a geração e solicitar um valor positivo
5. IF a API da Cora retorna erro na geração do Pix, THEN THE Sistema SHALL exibir mensagem de erro e registrar em log

### Requirement 7: Consulta de Extrato e Recebimentos

**User Story:** Como proprietário de uma empresa, eu quero consultar o extrato da minha conta Cora, para que eu possa ver todos os recebimentos e movimentações financeiras.

#### Acceptance Criteria

1. WHEN uma Empresa acessa a seção de extrato Cora, THE Sistema SHALL consultar a API da Cora e exibir o Extrato_Cora com entradas e saídas do período selecionado
2. WHEN o extrato é exibido, THE Sistema SHALL apresentar para cada transação: data, tipo (entrada/saída), descrição, valor e saldo após a movimentação
3. WHEN uma Empresa filtra o extrato por período, THE Sistema SHALL retornar apenas as transações dentro do intervalo de datas selecionado
4. THE Sistema SHALL exibir o saldo atual da Conta_Cora no topo da seção de extrato
5. IF a API da Cora retorna erro na consulta de extrato, THEN THE Sistema SHALL exibir mensagem de indisponibilidade e sugerir nova tentativa

### Requirement 8: Transferências

**User Story:** Como proprietário de uma empresa, eu quero transferir valores da minha conta Cora para outras contas bancárias, para que eu possa movimentar livremente o dinheiro recebido.

#### Acceptance Criteria

1. WHEN uma Empresa solicita transferência informando conta destino (banco, agência, conta, tipo), valor e descrição, THE Sistema SHALL enviar a solicitação de transferência à API da Cora
2. WHEN uma transferência é iniciada com sucesso, THE Sistema SHALL armazenar o registro na tabela cora_transacoes com status "iniciada" e informar que a aprovação será feita pelo app da Cora
3. WHEN o valor da transferência excede o saldo disponível na Conta_Cora, THE Sistema SHALL rejeitar a operação e informar o saldo insuficiente
4. WHEN uma Empresa consulta transferências realizadas, THE Sistema SHALL listar todas as transferências com status atualizado (iniciada, aprovada, concluída, cancelada, estornada)
5. IF a API da Cora retorna erro na solicitação de transferência, THEN THE Sistema SHALL exibir mensagem de erro e registrar em log

### Requirement 9: Integração na Venda (PDV)

**User Story:** Como proprietário de uma empresa, eu quero oferecer boleto Cora e Pix Cora como opções de pagamento ao finalizar uma venda, para que eu possa gerar cobranças automaticamente no fluxo de venda.

#### Acceptance Criteria

1. WHILE uma Empresa possui Conta_Cora vinculada e ativa, THE Sistema SHALL exibir as opções "Boleto Cora" e "Pix Cora" na tela de Nova Venda como métodos de pagamento
2. WHEN uma venda é finalizada com método "Boleto Cora", THE Sistema SHALL emitir automaticamente um Boleto_Registrado com os dados do cliente e valor da venda
3. WHEN uma venda é finalizada com método "Pix Cora", THE Sistema SHALL gerar automaticamente uma Cobranca_Pix com o valor da venda e exibir o QR Code
4. WHEN uma cobrança vinculada a uma venda é paga (confirmada via webhook), THE Sistema SHALL marcar a venda como paga automaticamente no caixa
5. WHILE uma Empresa não possui Conta_Cora vinculada, THE Sistema SHALL ocultar as opções "Boleto Cora" e "Pix Cora" na tela de Nova Venda

### Requirement 10: Integração em Contratos

**User Story:** Como proprietário de uma empresa, eu quero que parcelas de contratos gerem boletos automaticamente, para que eu possa cobrar clientes com contratos parcelados sem trabalho manual.

#### Acceptance Criteria

1. WHEN um contrato com parcelas é criado e a Empresa possui Conta_Cora vinculada, THE Sistema SHALL oferecer a opção de gerar carnê Cora automaticamente para as parcelas do contrato
2. WHEN a opção de geração automática de carnê é selecionada, THE Sistema SHALL emitir um carnê via API da Cora com boletos correspondentes a cada parcela do contrato
3. WHEN uma parcela de contrato vinculada a boleto Cora é paga (confirmada via webhook), THE Sistema SHALL dar baixa automática na parcela correspondente do contrato
4. WHEN um contrato com boletos Cora é cancelado, THE Sistema SHALL cancelar automaticamente todos os boletos pendentes (não pagos) vinculados ao contrato
5. IF a geração automática de carnê falha, THEN THE Sistema SHALL manter o contrato criado sem boletos e notificar a Empresa para emissão manual

### Requirement 11: Webhooks e Baixa Automática

**User Story:** Como proprietário de uma empresa, eu quero receber notificações automáticas de pagamento da Cora, para que o sistema dê baixa nas cobranças sem que eu precise verificar manualmente.

#### Acceptance Criteria

1. WHEN a Empresa vincula a Conta_Cora, THE Sistema SHALL registrar endpoints de webhook na Cora para os recursos: invoice (todos os triggers) e transfer (todos os triggers)
2. WHEN a Cora envia notificação de boleto pago (trigger "paid"), THE Sistema SHALL atualizar o status do boleto para "pago" na tabela cora_boletos com data de pagamento
3. WHEN a Cora envia notificação de boleto vencido (trigger "overdue"), THE Sistema SHALL atualizar o status do boleto para "vencido" na tabela cora_boletos
4. WHEN a Cora envia notificação de boleto cancelado (trigger "canceled"), THE Sistema SHALL atualizar o status do boleto para "cancelado" na tabela cora_boletos
5. WHEN a Cora envia notificação de transferência concluída (trigger "completed"), THE Sistema SHALL atualizar o status da transferência para "concluída" na tabela cora_transacoes
6. WHEN o webhook é recebido, THE Sistema SHALL validar a autenticidade da requisição verificando o token de autorização antes de processar
7. IF o webhook falha no processamento, THEN THE Sistema SHALL registrar o payload em log de erros e retornar status HTTP 500 para que a Cora reenvie a notificação
8. THE Sistema SHALL processar webhooks de forma idempotente, garantindo que processar a mesma notificação mais de uma vez não altere o estado final

### Requirement 12: Segurança e Armazenamento de Credenciais

**User Story:** Como administrador do sistema, eu quero que as credenciais da Cora sejam armazenadas com segurança, para que dados sensíveis dos clientes não fiquem expostos.

#### Acceptance Criteria

1. THE Sistema SHALL armazenar Token_Acesso e Token_Refresh criptografados com AES-256 utilizando chave de criptografia armazenada em variável de ambiente
2. THE Sistema SHALL transmitir tokens exclusivamente via HTTPS em todas as comunicações com a API da Cora
3. WHEN um Token_Acesso é renovado, THE Sistema SHALL invalidar o token anterior e armazenar o novo token criptografado
4. THE Sistema SHALL registrar em log de auditoria todas as operações financeiras (emissão, cancelamento, transferência) com identificação do usuário e timestamp
5. WHEN uma Empresa é desativada ou excluída, THE Sistema SHALL revogar tokens Cora e remover credenciais armazenadas

### Requirement 13: Controle de Acesso por Plano

**User Story:** Como administrador do sistema, eu quero que apenas empresas do plano Profissional acessem a integração Cora, para que a feature funcione como diferencial do plano premium.

#### Acceptance Criteria

1. THE Sistema SHALL verificar o plano da Empresa antes de permitir qualquer operação da integração Cora
2. WHEN uma Empresa do Plano_Profissional faz downgrade para um plano inferior, THE Sistema SHALL desabilitar a integração Cora e manter os dados históricos acessíveis em modo somente leitura
3. WHEN uma Empresa sem Plano_Profissional tenta acessar funcionalidades Cora, THE Sistema SHALL exibir mensagem de upgrade necessário com link para a página de planos
