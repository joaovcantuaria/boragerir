-- ============================================================
-- Fix RLS para suportar multi-empresa (plano gestão)
-- A função get_empresa_id() retorna apenas 1 empresa, 
-- mas o user pode ter várias. Precisamos alterar as policies
-- para verificar se empresa_id pertence ao user_id logado.
-- ============================================================

-- Nova função que verifica se uma empresa_id pertence ao usuário logado
CREATE OR REPLACE FUNCTION public.empresa_pertence_ao_usuario(emp_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresas WHERE id = emp_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Atualizar policies do caixas para usar a nova função ──
DROP POLICY IF EXISTS "caixas_select" ON public.caixas;
DROP POLICY IF EXISTS "caixas_insert" ON public.caixas;
DROP POLICY IF EXISTS "caixas_update" ON public.caixas;

CREATE POLICY "caixas_select" ON public.caixas FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "caixas_insert" ON public.caixas FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "caixas_update" ON public.caixas FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de movimentacoes_caixa ──
DROP POLICY IF EXISTS "movimentacoes_select" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "movimentacoes_insert" ON public.movimentacoes_caixa;

CREATE POLICY "movimentacoes_select" ON public.movimentacoes_caixa FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "movimentacoes_insert" ON public.movimentacoes_caixa FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de vendas ──
DROP POLICY IF EXISTS "vendas_select" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update" ON public.vendas;

CREATE POLICY "vendas_select" ON public.vendas FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "vendas_insert" ON public.vendas FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "vendas_update" ON public.vendas FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de itens_venda ──
DROP POLICY IF EXISTS "itens_venda_select" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_insert" ON public.itens_venda;

CREATE POLICY "itens_venda_select" ON public.itens_venda FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "itens_venda_insert" ON public.itens_venda FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de funcionarios ──
DROP POLICY IF EXISTS "funcionarios_select" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_update" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_delete" ON public.funcionarios;

CREATE POLICY "funcionarios_select" ON public.funcionarios FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "funcionarios_insert" ON public.funcionarios FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "funcionarios_update" ON public.funcionarios FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "funcionarios_delete" ON public.funcionarios FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de clientes ──
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de produtos_servicos ──
DROP POLICY IF EXISTS "produtos_select" ON public.produtos_servicos;
DROP POLICY IF EXISTS "produtos_insert" ON public.produtos_servicos;
DROP POLICY IF EXISTS "produtos_update" ON public.produtos_servicos;
DROP POLICY IF EXISTS "produtos_delete" ON public.produtos_servicos;

CREATE POLICY "produtos_select" ON public.produtos_servicos FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "produtos_insert" ON public.produtos_servicos FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "produtos_update" ON public.produtos_servicos FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "produtos_delete" ON public.produtos_servicos FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de categorias ──
DROP POLICY IF EXISTS "categorias_select" ON public.categorias;
DROP POLICY IF EXISTS "categorias_insert" ON public.categorias;
DROP POLICY IF EXISTS "categorias_update" ON public.categorias;
DROP POLICY IF EXISTS "categorias_delete" ON public.categorias;

CREATE POLICY "categorias_select" ON public.categorias FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "categorias_insert" ON public.categorias FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "categorias_update" ON public.categorias FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "categorias_delete" ON public.categorias FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de agendamentos ──
DROP POLICY IF EXISTS "agendamentos_select" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_update" ON public.agendamentos;

CREATE POLICY "agendamentos_select" ON public.agendamentos FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "agendamentos_insert" ON public.agendamentos FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "agendamentos_update" ON public.agendamentos FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de orcamentos ──
DROP POLICY IF EXISTS "orcamentos_select" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_insert" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_update" ON public.orcamentos;

CREATE POLICY "orcamentos_select" ON public.orcamentos FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "orcamentos_insert" ON public.orcamentos FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "orcamentos_update" ON public.orcamentos FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar policies de itens_orcamento ──
DROP POLICY IF EXISTS "itens_orcamento_select" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_insert" ON public.itens_orcamento;

CREATE POLICY "itens_orcamento_select" ON public.itens_orcamento FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "itens_orcamento_insert" ON public.itens_orcamento FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Atualizar seq_venda e seq_orcamento ──
DROP POLICY IF EXISTS "seq_venda_all" ON public.seq_venda;
CREATE POLICY "seq_venda_all" ON public.seq_venda FOR ALL USING (public.empresa_pertence_ao_usuario(empresa_id));

DROP POLICY IF EXISTS "seq_orcamento_all" ON public.seq_orcamento;
CREATE POLICY "seq_orcamento_all" ON public.seq_orcamento FOR ALL USING (public.empresa_pertence_ao_usuario(empresa_id));

-- ── Tabelas novas (recompensas, resgates, valores_receber) ──
DROP POLICY IF EXISTS "recompensas_select" ON public.recompensas_fidelidade;
DROP POLICY IF EXISTS "recompensas_insert" ON public.recompensas_fidelidade;
DROP POLICY IF EXISTS "recompensas_update" ON public.recompensas_fidelidade;
DROP POLICY IF EXISTS "recompensas_delete" ON public.recompensas_fidelidade;

CREATE POLICY "recompensas_select" ON public.recompensas_fidelidade FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "recompensas_insert" ON public.recompensas_fidelidade FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "recompensas_update" ON public.recompensas_fidelidade FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "recompensas_delete" ON public.recompensas_fidelidade FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));

DROP POLICY IF EXISTS "resgates_select" ON public.resgates_recompensas;
DROP POLICY IF EXISTS "resgates_insert" ON public.resgates_recompensas;

CREATE POLICY "resgates_select" ON public.resgates_recompensas FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "resgates_insert" ON public.resgates_recompensas FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));

DROP POLICY IF EXISTS "valores_receber_select" ON public.valores_receber;
DROP POLICY IF EXISTS "valores_receber_insert" ON public.valores_receber;
DROP POLICY IF EXISTS "valores_receber_update" ON public.valores_receber;
DROP POLICY IF EXISTS "valores_receber_delete" ON public.valores_receber;

CREATE POLICY "valores_receber_select" ON public.valores_receber FOR SELECT USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "valores_receber_insert" ON public.valores_receber FOR INSERT WITH CHECK (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "valores_receber_update" ON public.valores_receber FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "valores_receber_delete" ON public.valores_receber FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));
