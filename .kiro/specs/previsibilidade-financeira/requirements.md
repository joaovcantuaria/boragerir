# Documento de Requisitos

## Introdução

Adição de funcionalidades de previsibilidade financeira à aba **Financeiro** do sistema Bora Gerir — sistema de gestão para pequenos negócios como salões de beleza, barbearias e congêneres.

O módulo atual de Financeiro possui as abas: Faturamento, Vendas, A Receber, Formas de Pagamento e Relatórios. Este spec introduz três novas abas:

1. **Contas a Pagar** — cadastro e controle de despesas futuras (avulsas ou recorrentes).
2. **Projeção de Receitas** — previsão de ganhos com base em histórico de vendas e agendamentos futuros.
3. **Fluxo de Caixa** — visão consolidada de receitas previstas versus despesas previstas, com saldo projetado por período.

O objetivo é dar ao dono do negócio clareza sobre o que vai entrar e sair nos próximos dias/semanas/mês, permitindo decisões financeiras antecipadas.

---

## Glossário

- **Sistema**: o sistema Bora Gerir (aplicação Next.js 14 com Supabase/PostgreSQL).
- **Módulo_Financeiro**: conjunto de componentes da aba Financeiro do Sistema.
- **Conta_Pagar**: registro de uma despesa futura com data de vencimento, valor e status.
- **Recorrencia**: configuração que define a criação automática periódica de uma Conta_Pagar (mensal ou semanal).
- **Projeção_Receita**: estimativa de receita futura calculada a partir do histórico de vendas e de agendamentos com status `agendado` ou `confirmado`.
- **Fluxo_Caixa_Projetado**: diferença entre Projeção_Receita e total de Contas_Pagar pendentes para um período.
- **Período**: intervalo de tempo selecionado pelo usuário — dia, semana ou mês.
- **Status_Conta**: estado de uma Conta_Pagar — `pendente`, `pago` ou `atrasado`.
- **Empresa**: registro na tabela `empresas` associado ao usuário autenticado.
- **Usuário**: proprietário autenticado da Empresa no Sistema.

---

## Requisitos

### Requisito 1: Cadastro de Contas a Pagar

**User Story:** Como dono de negócio, quero cadastrar despesas futuras com data de vencimento, para saber com antecedência o que preciso pagar e quando.

#### Critérios de Aceitação

1. WHEN o Usuário submete o formulário de nova Conta_Pagar com descrição, valor e data de vencimento preenchidos, THE Sistema SHALL persistir a Conta_Pagar na tabela `contas_pagar` associada à Empresa do Usuário.
2. WHEN o Usuário submete o formulário de nova Conta_Pagar com campo obrigatório ausente (descrição, valor ou data de vencimento), THE Sistema SHALL exibir mensagem de validação indicando o campo ausente e SHALL NOT persistir o registro.
3. THE Sistema SHALL aceitar valor de Conta_Pagar maior que R$ 0,00 e menor ou igual a R$ 9.999.999,99.
4. WHEN o Usuário seleciona recorrência mensal ao cadastrar uma Conta_Pagar, THE Sistema SHALL criar automaticamente instâncias mensais da Conta_Pagar para os próximos 12 meses a partir da data de vencimento informada.
5. WHEN o Usuário seleciona recorrência semanal ao cadastrar uma Conta_Pagar, THE Sistema SHALL criar automaticamente instâncias semanais da Conta_Pagar para as próximas 52 semanas a partir da data de vencimento informada.
6. WHERE a recorrência não for selecionada, THE Sistema SHALL criar exatamente 1 instância avulsa de Conta_Pagar.
7. THE Sistema SHALL permitir ao Usuário categorizar a Conta_Pagar com as categorias: aluguel, energia, água, fornecedor, salário, marketing, manutenção e outros.

---

### Requisito 2: Visualização e Gestão de Contas a Pagar

**User Story:** Como dono de negócio, quero ver todas as minhas contas a pagar organizadas por período, para controlar meu fluxo de pagamentos.

#### Critérios de Aceitação

1. WHEN o Usuário acessa a aba Contas a Pagar, THE Módulo_Financeiro SHALL exibir a lista de Contas_Pagar da Empresa agrupadas por data de vencimento, ordenadas da mais próxima para a mais distante.
2. THE Módulo_Financeiro SHALL exibir para cada Conta_Pagar: descrição, categoria, valor, data de vencimento e Status_Conta.
3. WHILE a data atual for posterior à data de vencimento de uma Conta_Pagar com Status_Conta `pendente`, THE Sistema SHALL exibir o Status_Conta dessa Conta_Pagar como `atrasado`.
4. WHEN o Usuário marca uma Conta_Pagar como paga, THE Sistema SHALL atualizar o Status_Conta para `pago` e SHALL registrar a data do pagamento.
5. WHEN o Usuário exclui uma Conta_Pagar avulsa, THE Sistema SHALL remover o registro permanentemente após confirmação explícita do Usuário.
6. WHEN o Usuário exclui uma Conta_Pagar recorrente, THE Sistema SHALL apresentar as opções: "excluir apenas esta ocorrência" ou "excluir esta e todas as futuras", e SHALL executar a exclusão conforme a escolha do Usuário.
7. THE Módulo_Financeiro SHALL permitir filtrar as Contas_Pagar por Período (dia, semana ou mês) e por Status_Conta.
8. THE Módulo_Financeiro SHALL exibir o total de Contas_Pagar pendentes e atrasadas do Período selecionado em destaque no topo da aba.

---

### Requisito 3: Projeção de Receitas

**User Story:** Como dono de negócio, quero visualizar uma projeção de quanto vou faturar no dia, semana ou mês, para planejar minhas finanças com antecedência.

#### Critérios de Aceitação

1. WHEN o Usuário acessa a aba Fluxo de Caixa e seleciona um Período, THE Módulo_Financeiro SHALL calcular e exibir a Projeção_Receita para aquele Período.
2. THE Módulo_Financeiro SHALL calcular a Projeção_Receita somando: (a) o valor total das vendas com status `concluida` já realizadas dentro do Período, e (b) o valor dos serviços com preço definido em agendamentos com status `agendado` ou `confirmado` dentro do Período.
3. WHEN um agendamento não possui serviço com preço cadastrado, THE Módulo_Financeiro SHALL excluir esse agendamento do cálculo da Projeção_Receita sem exibir erro.
4. THE Módulo_Financeiro SHALL exibir a Projeção_Receita separada em dois componentes visíveis: "Receitas confirmadas" (vendas concluídas) e "Receitas previstas" (agendamentos futuros).
5. WHEN o Período selecionado é "mês", THE Módulo_Financeiro SHALL exibir adicionalmente a média diária de receita dos últimos 3 meses completos como referência comparativa.

---

### Requisito 4: Fluxo de Caixa Projetado

**User Story:** Como dono de negócio, quero ver a diferença entre o que vou receber e o que vou gastar em um período, para saber se terei saldo positivo ou negativo.

#### Critérios de Aceitação

1. WHEN o Usuário acessa a aba Fluxo de Caixa, THE Módulo_Financeiro SHALL exibir o Fluxo_Caixa_Projetado calculado como: Projeção_Receita menos a soma dos valores de Contas_Pagar com Status_Conta `pendente` ou `atrasado` dentro do Período selecionado.
2. THE Módulo_Financeiro SHALL exibir o Fluxo_Caixa_Projetado com indicação visual de positivo (verde) quando o valor for maior que R$ 0,00, e negativo (vermelho) quando o valor for menor ou igual a R$ 0,00.
3. THE Módulo_Financeiro SHALL exibir um gráfico de barras com receitas previstas versus despesas previstas, agrupadas por dia quando o Período for "semana" ou por semana quando o Período for "mês".
4. WHEN o Período selecionado é "dia", THE Módulo_Financeiro SHALL exibir apenas os valores totais de receitas e despesas para aquele dia, sem gráfico de barras.
5. THE Módulo_Financeiro SHALL permitir ao Usuário alternar entre os Períodos (dia, semana, mês) sem recarregar a página.

---

### Requisito 5: Atualização Automática de Status de Contas Atrasadas

**User Story:** Como dono de negócio, quero que o sistema identifique automaticamente contas vencidas, para não precisar verificar manualmente o que está em atraso.

#### Critérios de Aceitação

1. WHEN o Usuário abre o Módulo_Financeiro, THE Sistema SHALL verificar todas as Contas_Pagar com Status_Conta `pendente` da Empresa e SHALL exibir como `atrasado` aquelas cuja data de vencimento seja anterior à data atual.
2. THE Sistema SHALL exibir o número total de contas com Status_Conta `atrasado` como badge de alerta na aba Contas a Pagar, de forma análoga ao badge existente na aba A Receber.
3. IF a Empresa não possuir nenhuma Conta_Pagar cadastrada, THEN THE Módulo_Financeiro SHALL exibir mensagem orientativa convidando o Usuário a cadastrar sua primeira despesa.

---

### Requisito 6: Integridade e Isolamento de Dados

**User Story:** Como dono de negócio, quero que minhas informações financeiras sejam privadas e isoladas de outras empresas, para garantir a segurança dos meus dados.

#### Critérios de Aceitação

1. THE Sistema SHALL aplicar Row Level Security (RLS) na tabela `contas_pagar`, garantindo que cada Usuário acesse somente as Contas_Pagar associadas à sua Empresa.
2. WHEN o Usuário autenticado realiza qualquer operação (leitura, criação, atualização, exclusão) em Contas_Pagar, THE Sistema SHALL validar que o `empresa_id` do registro corresponde ao `empresa_id` do Usuário autenticado.
3. IF uma requisição à API de Contas_Pagar for feita sem autenticação válida, THEN THE Sistema SHALL retornar HTTP 401 e SHALL NOT expor nenhum dado de Conta_Pagar.
