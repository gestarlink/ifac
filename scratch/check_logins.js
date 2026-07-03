import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const USERS = [
  {
    email: "machienzle@coordenador.com.br",
    password: "Fac@2026!Seguro",
    label: "Jay Machienzle (Seed Coordenador)"
  },
  {
    email: "rodilson@professor.com.br",
    password: "Fac@2026!Seguro",
    label: "Rodilson Bardales (Seed Professor)"
  },
  {
    email: "delcimar@monitor.com.br",
    password: "Fac@2026!Seguro",
    label: "Francisco Delcimar (Seed Monitor)"
  },
  {
    email: "gabriel@coordenadorgeral.com.br",
    password: "Fac@2026!Seguro",
    label: "Gabriel (Seed Coordenador Geral)"
  },
  {
    email: "jmachienzle1@gmail.com",
    password: "Fac@2026!Seguro",
    label: "Jay Machienzle (Migrado)"
  },
  {
    email: "gestarmicla@gmail.com",
    password: "Fac@2026!Seguro",
    label: "Rodilson (Migrado)"
  },
  {
    email: "wktdiacre@gmail.com",
    password: "Fac@2026!Seguro",
    label: "Francisco Delcimar (Migrado)"
  }
];

async function run() {
  console.log("--- TESTANDO LOGINS ---");
  for (const user of USERS) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    if (error) {
      console.log(`❌ ${user.label} (${user.email}): Erro - ${error.message}`);
    } else {
      console.log(`✅ ${user.label} (${user.email}): SUCESSO!`);
      // check role
      const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', data.user.id);
      console.log("   Papeis:", roleData);
    }
  }

  console.log("\n--- CRIANDO NOVO USUÁRIO ADMINISTRADOR DE TESTE ---");
  const newEmail = "admin@gestarlink.com.br";
  const newPassword = "GestarLink@2026!";
  const newName = "Administrador Geral (GestarLink)";
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: newEmail,
    password: newPassword,
    options: {
      data: {
        nome: newName
      }
    }
  });

  if (signUpError) {
    console.log(`❌ Erro ao criar novo usuário: ${signUpError.message}`);
  } else if (signUpData?.user) {
    const userId = signUpData.user.id;
    console.log(`✅ Usuário criado com ID: ${userId}`);
    
    // Now sign in to get active session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: newEmail,
      password: newPassword
    });

    if (signInError) {
      console.log(`❌ Erro ao logar com o novo usuário para inserir perfis: ${signInError.message}`);
    } else {
      // Initialize a new authenticated client to insert
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${signInData.session.access_token}`
          }
        }
      });

      // Insert profile
      const { error: profileErr } = await authSupabase.from('profiles').insert({
        user_id: userId,
        nome: newName,
        email: newEmail,
        cargo: "Coordenador Geral"
      });

      if (profileErr) {
        console.log(`❌ Erro ao inserir perfil: ${profileErr.message}`);
      } else {
        console.log(`✅ Perfil criado para o novo usuário!`);
      }

      // Insert role
      const { error: roleErr } = await authSupabase.from('user_roles').insert({
        user_id: userId,
        role: "coordenador_geral"
      });

      if (roleErr) {
        console.log(`❌ Erro ao inserir papel: ${roleErr.message}`);
      } else {
        console.log(`✅ Papel 'coordenador_geral' associado ao novo usuário!`);
      }
    }
  }
}

run();
