
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('coordenador', 'professor', 'monitor');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cargo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Nucleos table
CREATE TABLE public.nucleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nucleos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view nucleos" ON public.nucleos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordenador can manage nucleos" ON public.nucleos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordenador'));

-- Turmas table
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  modalidade TEXT NOT NULL DEFAULT 'FUTEBOL',
  turno TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view turmas" ON public.turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordenador can manage turmas" ON public.turmas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordenador'));

-- Beneficiarios (alunos) table
CREATE TABLE public.beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  idade INTEGER,
  sexo TEXT,
  modalidade TEXT NOT NULL DEFAULT 'FUTEBOL',
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficiarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view beneficiarios" ON public.beneficiarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordenador can manage beneficiarios" ON public.beneficiarios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordenador'));

-- Presencas table (daily attendance)
CREATE TABLE public.presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id UUID REFERENCES public.beneficiarios(id) ON DELETE CASCADE NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT false,
  registrado_por UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beneficiario_id, data)
);
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view presencas" ON public.presencas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert presencas" ON public.presencas FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);
CREATE POLICY "Staff can update presencas" ON public.presencas FOR UPDATE TO authenticated USING (auth.uid() = registrado_por);

-- Atividades (daily activities / weekly reports)
CREATE TYPE public.atividade_status AS ENUM ('pendente', 'aprovada', 'correcao_solicitada');

CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  turma_id UUID REFERENCES public.turmas(id),
  nucleo_id UUID REFERENCES public.nucleos(id) NOT NULL,
  nome_atividade TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_conclusao DATE,
  anotacoes TEXT,
  semana INTEGER,
  mes INTEGER,
  ano INTEGER,
  status atividade_status NOT NULL DEFAULT 'pendente',
  feedback_coordenador TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view atividades" ON public.atividades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own atividades" ON public.atividades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own atividades" ON public.atividades FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'coordenador'));

-- Fotos table
CREATE TABLE public.fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id),
  nucleo_id UUID REFERENCES public.nucleos(id) NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view fotos" ON public.fotos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can upload fotos" ON public.fotos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- Estoque (inventory/materials)
CREATE TABLE public.estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES public.nucleos(id) ON DELETE CASCADE NOT NULL,
  item TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  estoque_minimo INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view estoque" ON public.estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordenador can manage estoque" ON public.estoque FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordenador'));

-- Movimentacoes de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estoque_id UUID REFERENCES public.estoque(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  observacao TEXT,
  registrado_por UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view movimentacoes" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert movimentacoes" ON public.movimentacoes_estoque FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_atividades_updated_at BEFORE UPDATE ON public.atividades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON public.estoque FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.presencas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fotos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_estoque;

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true);
CREATE POLICY "Authenticated can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Coordenador can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordenador'));
