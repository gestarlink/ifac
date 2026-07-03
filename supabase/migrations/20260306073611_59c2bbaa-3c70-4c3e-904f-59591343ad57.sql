
-- Allow staff to delete their own presencas (needed for re-saving attendance)
CREATE POLICY "Staff can delete own presencas" ON public.presencas
FOR DELETE TO authenticated
USING (auth.uid() = registrado_por);

-- Allow staff to update estoque (professor/monitor need to update quantities)
CREATE POLICY "Staff can update estoque" ON public.estoque
FOR UPDATE TO authenticated
USING (true);
