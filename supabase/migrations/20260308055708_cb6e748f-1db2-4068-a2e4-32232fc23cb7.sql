
-- Fix RLS policies: change RESTRICTIVE to PERMISSIVE for all SELECT policies
-- This is the root cause of atividades not appearing in coordinator's approval page

-- atividades
DROP POLICY IF EXISTS "Authenticated can view atividades" ON public.atividades;
CREATE POLICY "Authenticated can view atividades" ON public.atividades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own atividades" ON public.atividades;
CREATE POLICY "Users can insert own atividades" ON public.atividades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own atividades" ON public.atividades;
CREATE POLICY "Users can update own atividades" ON public.atividades FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'coordenador'));

-- beneficiarios
DROP POLICY IF EXISTS "Authenticated can view beneficiarios" ON public.beneficiarios;
CREATE POLICY "Authenticated can view beneficiarios" ON public.beneficiarios FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Coordenador can manage beneficiarios" ON public.beneficiarios;
CREATE POLICY "Coordenador can manage beneficiarios" ON public.beneficiarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'coordenador')) WITH CHECK (has_role(auth.uid(), 'coordenador'));

-- Allow professor/monitor to insert beneficiarios too
CREATE POLICY "Staff can insert beneficiarios" ON public.beneficiarios FOR INSERT TO authenticated WITH CHECK (true);

-- estoque
DROP POLICY IF EXISTS "Authenticated can view estoque" ON public.estoque;
CREATE POLICY "Authenticated can view estoque" ON public.estoque FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Coordenador can manage estoque" ON public.estoque;
CREATE POLICY "Coordenador can manage estoque" ON public.estoque FOR ALL TO authenticated USING (has_role(auth.uid(), 'coordenador')) WITH CHECK (has_role(auth.uid(), 'coordenador'));

DROP POLICY IF EXISTS "Staff can update estoque" ON public.estoque;
CREATE POLICY "Staff can update estoque" ON public.estoque FOR UPDATE TO authenticated USING (true);

-- fotos
DROP POLICY IF EXISTS "Authenticated can view fotos" ON public.fotos;
CREATE POLICY "Authenticated can view fotos" ON public.fotos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can upload fotos" ON public.fotos;
CREATE POLICY "Staff can upload fotos" ON public.fotos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- movimentacoes_estoque
DROP POLICY IF EXISTS "Authenticated can view movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Authenticated can view movimentacoes" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can insert movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Staff can insert movimentacoes" ON public.movimentacoes_estoque FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);

-- nucleos
DROP POLICY IF EXISTS "Authenticated can view nucleos" ON public.nucleos;
CREATE POLICY "Authenticated can view nucleos" ON public.nucleos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Coordenador can manage nucleos" ON public.nucleos;
CREATE POLICY "Coordenador can manage nucleos" ON public.nucleos FOR ALL TO authenticated USING (has_role(auth.uid(), 'coordenador')) WITH CHECK (has_role(auth.uid(), 'coordenador'));

-- presencas
DROP POLICY IF EXISTS "Authenticated can view presencas" ON public.presencas;
CREATE POLICY "Authenticated can view presencas" ON public.presencas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can insert presencas" ON public.presencas;
CREATE POLICY "Staff can insert presencas" ON public.presencas FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);

DROP POLICY IF EXISTS "Staff can update presencas" ON public.presencas;
CREATE POLICY "Staff can update presencas" ON public.presencas FOR UPDATE TO authenticated USING (auth.uid() = registrado_por);

DROP POLICY IF EXISTS "Staff can delete own presencas" ON public.presencas;
CREATE POLICY "Staff can delete own presencas" ON public.presencas FOR DELETE TO authenticated USING (auth.uid() = registrado_por);

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- turmas
DROP POLICY IF EXISTS "Authenticated can view turmas" ON public.turmas;
CREATE POLICY "Authenticated can view turmas" ON public.turmas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Coordenador can manage turmas" ON public.turmas;
CREATE POLICY "Coordenador can manage turmas" ON public.turmas FOR ALL TO authenticated USING (has_role(auth.uid(), 'coordenador')) WITH CHECK (has_role(auth.uid(), 'coordenador'));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Coordenador can manage roles" ON public.user_roles;
CREATE POLICY "Coordenador can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'coordenador')) WITH CHECK (has_role(auth.uid(), 'coordenador'));

-- Allow inserting own role during signup
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
