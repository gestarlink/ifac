
-- Fix overly permissive estoque update policy
DROP POLICY "Staff can update estoque" ON public.estoque;

-- More restrictive: only authenticated users with a role can update estoque
CREATE POLICY "Staff can update estoque" ON public.estoque
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'coordenador') OR
  has_role(auth.uid(), 'professor') OR
  has_role(auth.uid(), 'monitor')
);
