
CREATE TABLE public.relatorios_fotograficos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  url text NOT NULL,
  nome_arquivo text NOT NULL,
  total_fotos integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios_fotograficos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view relatorios" ON public.relatorios_fotograficos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coordenador can manage relatorios" ON public.relatorios_fotograficos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordenador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordenador'::app_role));
