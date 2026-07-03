import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Edit, UserX, UserCheck } from "lucide-react";

interface UserProfile {
  user_id: string;
  nome: string;
  email: string | null;
  cargo: string | null;
  role: string;
}

const UsuariosPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", password: "", cargo: "", role: "professor" });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles && roles) {
      const merged: UserProfile[] = profiles.map((p) => {
        const userRole = roles.find((r) => r.user_id === p.user_id);
        return {
          user_id: p.user_id,
          nome: p.nome,
          email: p.email,
          cargo: p.cargo,
          role: userRole?.role || "sem papel",
        };
      });
      setUsers(merged);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.nome) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create", email: form.email, password: form.password, nome: form.nome, cargo: form.cargo, role: form.role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário criado com sucesso!");
      setDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      toast.error("Erro ao criar usuário: " + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "update",
          user_id: editingUser.user_id,
          nome: form.nome,
          cargo: form.cargo,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário atualizado!");
      setDialogOpen(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: currentlyActive ? "disable" : "enable", user_id: userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(currentlyActive ? "Usuário desativado" : "Usuário reativado");
      loadUsers();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    setForm({ nome: user.nome, email: user.email || "", password: "", cargo: user.cargo || "", role: user.role });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingUser(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => setForm({ nome: "", email: "", password: "", cargo: "", role: "professor" });

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      coordenador: "bg-primary/10 text-primary border-primary/20",
      coordenador_geral: "bg-accent/10 text-accent-foreground border-accent/20",
      professor: "bg-success/10 text-success border-success/20",
      monitor: "bg-warning/10 text-warning border-warning/20",
    };
    const labels: Record<string, string> = {
      coordenador: "Coordenador",
      coordenador_geral: "Coord. Geral",
      professor: "Professor",
      monitor: "Monitor",
    };
    return <Badge variant="outline" className={colors[role] || ""}>{labels[role] || role}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Criar, editar e desativar contas do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><UserPlus className="w-4 h-4 mr-2" />Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              )}
              <div className="space-y-2">
                <Label>{editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha *"}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Papel no Sistema *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="coordenador_geral">Coordenador Geral</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={editingUser ? handleUpdate : handleCreate}>
                {editingUser ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário cadastrado</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.cargo}</TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleActive(u.user_id, true)}>
                        <UserX className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UsuariosPage;
