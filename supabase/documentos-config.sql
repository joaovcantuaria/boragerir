-- Configurações de layout para recibos e orçamentos
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS doc_cor_primaria     TEXT DEFAULT '#F26E1D',
  ADD COLUMN IF NOT EXISTS doc_mensagem_recibo  TEXT DEFAULT 'Obrigado pela preferência!',
  ADD COLUMN IF NOT EXISTS doc_mensagem_orcamento TEXT DEFAULT 'Este orçamento não tem valor fiscal.',
  ADD COLUMN IF NOT EXISTS doc_mostrar_cnpj     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS doc_mostrar_endereco BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS doc_mostrar_telefone BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS doc_mostrar_logo     BOOLEAN DEFAULT true;
