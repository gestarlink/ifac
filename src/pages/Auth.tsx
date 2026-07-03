import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Mail, Lock } from "lucide-react";
import logoFac from "@/assets/logo-fac.png";
import SplashScreen from "@/components/SplashScreen";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Mostrar splash apenas uma vez por sessão
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("splash_shown");
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Erro ao entrar: " + error.message);
    } else if (data.user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const isCoord = roles?.some((r) => r.role === "coordenador");
      const isCoordGeral = roles?.some((r) => r.role === "coordenador_geral");
      toast.success("Login realizado!");
      navigate(isCoord || isCoordGeral ? "/dashboard" : "/app");
    }
    setLoading(false);
  };

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          sessionStorage.setItem("splash_shown", "1");
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, hsl(215 90% 25%) 0%, hsl(215 90% 12%) 50%, hsl(215 90% 6%) 100%)",
      }}
    >
      {/* Decorative blurred shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
            <img
              src={logoFac}
              alt="Instituto Formando Águias & Campeões"
              className="relative w-64 h-64 mx-auto object-contain drop-shadow-[0_0_30px_hsl(215_90%_55%/0.5)]"
            />
          </div>
          <h1 className="text-white font-display font-bold text-2xl -mt-2 tracking-wide">
            Instituto
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Formando Águias & Campeões
          </p>
        </div>

        {/* Card de login - efeito glassmorphism */}
        <div
          className="rounded-2xl p-7 border border-white/10 shadow-2xl backdrop-blur-xl"
          style={{ background: "hsl(215 30% 12% / 0.55)" }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white/90">Acesso ao Sistema</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 text-xs uppercase tracking-wider">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80 text-xs uppercase tracking-wider">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold text-base shadow-lg hover:shadow-primary/50 transition-all"
              disabled={loading}
            >
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/50 mt-6">
          Termo de Fomento 972536/2024 — Ministério do Esporte
        </p>
      </div>
    </div>
  );
};

export default Auth;
