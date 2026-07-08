-- Adicionar policies de UPDATE e DELETE para movimentacoes_caixa
DROP POLICY IF EXISTS "movimentacoes_update" ON public.movimentacoes_caixa;
DROP POLICY IF EXISTS "movimentacoes_delete" ON public.movimentacoes_caixa;

CREATE POLICY "movimentacoes_update" ON public.movimentacoes_caixa FOR UPDATE USING (public.empresa_pertence_ao_usuario(empresa_id));
CREATE POLICY "movimentacoes_delete" ON public.movimentacoes_caixa FOR DELETE USING (public.empresa_pertence_ao_usuario(empresa_id));
