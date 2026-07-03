import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSeed {
  email: string;
  password: string;
  nome: string;
  cargo: string;
  role: "coordenador" | "professor" | "monitor" | "coordenador_geral";
}

const USERS: UserSeed[] = [
  {
    email: "machienzle@coordenador.com.br",
    password: "Fac@2026!Seguro",
    nome: "Jay Machienzle",
    cargo: "Coordenador",
    role: "coordenador",
  },
  {
    email: "rodilson@professor.com.br",
    password: "Fac@2026!Seguro",
    nome: "Rodilson Bardales",
    cargo: "Professor",
    role: "professor",
  },
  {
    email: "delcimar@monitor.com.br",
    password: "Fac@2026!Seguro",
    nome: "Francisco Delcimar",
    cargo: "Monitor",
    role: "monitor",
  },
  {
    email: "gabriel@coordenadorgeral.com.br",
    password: "Fac@2026!Seguro",
    nome: "Gabriel",
    cargo: "Coordenador Geral",
    role: "coordenador_geral",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: Record<string, string> = {};

    for (const u of USERS) {
      const { data: existing } = await supabase.auth.admin.listUsers();
      const found = existing?.users?.find((x) => x.email === u.email);

      if (found) {
        results[u.email] = "já existe";
        continue;
      }

      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });

      if (createErr) {
        results[u.email] = `erro: ${createErr.message}`;
        continue;
      }

      const userId = newUser.user.id;

      await supabase.from("profiles").insert({
        user_id: userId,
        nome: u.nome,
        email: u.email,
        cargo: u.cargo,
      });

      await supabase.from("user_roles").insert({
        user_id: userId,
        role: u.role,
      });

      results[u.email] = "criado com sucesso";
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
