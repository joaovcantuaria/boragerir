-- Adicionar suporte a PJ (Pessoa Jurídica) na tabela clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT NOT NULL DEFAULT 'pf' CHECK (tipo_pessoa IN ('pf', 'pj')),
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- CPF passa a ser opcional (PJ usa CNPJ)
-- Removemos o NOT NULL do CPF e ajustamos a constraint de unicidade
ALTER TABLE public.clientes
  ALTER COLUMN cpf DROP NOT NULL;

-- A unicidade agora é por documento (cpf ou cnpj) dentro da empresa
DROP INDEX IF EXISTS clientes_empresa_id_cpf_key;
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_empresa_id_cpf_key;

-- Nova constraint: cpf único por empresa (quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_cpf
  ON public.clientes (empresa_id, cpf)
  WHERE cpf IS NOT NULL AND cpf NOT LIKE 'ONLINE-%';

-- CNPJ único por empresa (quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_empresa_cnpj
  ON public.clientes (empresa_id, cnpj)
  WHERE cnpj IS NOT NULL;
