
-- Fix fotos: allow coordenador to UPDATE and DELETE
CREATE POLICY "Coordenador can update fotos" ON public.fotos
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'coordenador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordenador'::app_role));

CREATE POLICY "Coordenador can delete fotos" ON public.fotos
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'coordenador'::app_role));

-- Fix estoque: allow coordenador to DELETE
CREATE POLICY "Coordenador can delete estoque" ON public.estoque
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'coordenador'::app_role));

-- Create documentos_beneficiarios table
CREATE TABLE public.documentos_beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id UUID NOT NULL REFERENCES public.beneficiarios(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'documento',
  url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_beneficiarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view documentos" ON public.documentos_beneficiarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert documentos" ON public.documentos_beneficiarios
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Coordenador can delete documentos" ON public.documentos_beneficiarios
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'coordenador'::app_role));

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Storage policies for documentos bucket
CREATE POLICY "Authenticated can upload documentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Public can view documentos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'documentos');

CREATE POLICY "Coordenador can delete documentos files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND has_role(auth.uid(), 'coordenador'::app_role));
