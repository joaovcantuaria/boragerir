-- Adicionar campos de código e unidade de medida em produtos_servicos
ALTER TABLE public.produtos_servicos
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'unidade' CHECK (unidade_medida IN ('unidade','pacote','kilo','litro','hora','sessao','metro','caixa','par','outro'));

-- Adicionar campos de configuração do recibo na tabela empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS recibo_template TEXT DEFAULT 'padrao' CHECK (recibo_template IN ('padrao','moderno','minimalista','colorido')),
  ADD COLUMN IF NOT EXISTS recibo_cor_primaria TEXT DEFAULT '#F26E1D',
  ADD COLUMN IF NOT EXISTS recibo_rodape TEXT DEFAULT 'Obrigado pela preferência!';

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos_servicos(empresa_id, codigo);
