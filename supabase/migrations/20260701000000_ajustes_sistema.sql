-- =============================================================
-- Migration: Ajustes do Sistema IFAC (01/07/2026)
-- 1. Coluna foto_url na tabela estoque
-- 2. Tabela envios_documentos para fluxo de validação
-- 3. Tabela envios_historico para registrar ações
-- =============================================================

-- 1. Adicionar coluna de foto ao estoque
ALTER TABLE public.estoque ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Criar tipo enum para status de envio
DO $$ BEGIN
  CREATE TYPE public.envio_status AS ENUM (
    'enviado',
    'em_analise',
    'aprovado',
    'devolvido',
    'reenviado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Criar tipo enum para tipo de documento
DO $$ BEGIN
  CREATE TYPE public.envio_tipo AS ENUM (
    'chamada',
    'relatorio_fotografico'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Tabela principal de envios de documentos
CREATE TABLE IF NOT EXISTS public.envios_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo envio_tipo NOT NULL,
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  status envio_status NOT NULL DEFAULT 'enviado',
  enviado_por UUID REFERENCES auth.users(id) NOT NULL,
  revisado_por UUID REFERENCES auth.users(id),
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, nucleo_id, turma_id, mes, ano)
);

ALTER TABLE public.envios_documentos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver envios
CREATE POLICY "Authenticated can view envios" ON public.envios_documentos
  FOR SELECT TO authenticated USING (true);

-- Quem enviou pode inserir
CREATE POLICY "Staff can insert envios" ON public.envios_documentos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = enviado_por);

-- Quem enviou pode atualizar (reenviar) e coordenadores podem atualizar (aprovar/devolver)
CREATE POLICY "Staff and coord can update envios" ON public.envios_documentos
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = enviado_por
    OR has_role(auth.uid(), 'coordenador')
    OR has_role(auth.uid(), 'coordenador_geral')
  );

-- 5. Tabela de histórico de ações nos envios
CREATE TABLE IF NOT EXISTS public.envios_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id UUID REFERENCES public.envios_documentos(id) ON DELETE CASCADE NOT NULL,
  acao envio_status NOT NULL,
  realizado_por UUID REFERENCES auth.users(id) NOT NULL,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.envios_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view historico" ON public.envios_historico
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert historico" ON public.envios_historico
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = realizado_por);

-- 6. Trigger para atualizar updated_at em envios_documentos
CREATE TRIGGER update_envios_updated_at
  BEFORE UPDATE ON public.envios_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Habilitar realtime para envios
ALTER PUBLICATION supabase_realtime ADD TABLE public.envios_documentos;
