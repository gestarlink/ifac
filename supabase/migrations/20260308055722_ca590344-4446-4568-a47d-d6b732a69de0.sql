
-- Fix overly permissive policies
DROP POLICY IF EXISTS "Staff can insert beneficiarios" ON public.beneficiarios;
CREATE POLICY "Staff can insert beneficiarios" ON public.beneficiarios FOR INSERT TO authenticated 
  WITH CHECK (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'professor') OR has_role(auth.uid(), 'monitor'));

DROP POLICY IF EXISTS "Staff can update estoque" ON public.estoque;
CREATE POLICY "Staff can update estoque" ON public.estoque FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(), 'coordenador') OR has_role(auth.uid(), 'professor') OR has_role(auth.uid(), 'monitor'));
