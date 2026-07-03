import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, CheckCircle, Users } from "lucide-react";

/** Check if a turma is scheduled for today based on turno string */
const isTurmaToday = (turno: string): boolean => {
  const dow = new Date().getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri
  const isSegQua = /seg/i.test(turno) || /segunda/i.test(turno);
  const isTerQui = /ter[çc]a/i.test(turno) || /quinta/i.test(turno);
  if (isSegQua && (dow === 1 || dow === 3)) return true;
  if (isTerQui && (dow === 2 || dow === 4)) return true;
  return false;
};

const MobileChamada = () => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState("");
  const [alunos, setAlunos] = useState<any[]>([]);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("turmas").select("*").order("nome").then(({ data }) => {
      const all = data || [];
      setTurmas(all);
      // Auto-select first turma scheduled for today
      const todayTurma = all.find((t) => isTurmaToday(t.turno));
      if (todayTurma) setSelectedTurma(todayTurma.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedTurma) return;
    setSaved(false);
    loadAlunos();
  }, [selectedTurma]);

  const loadAlunos = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: alunosData } = await supabase
      .from("beneficiarios").select("id, nome")
      .eq("turma_id", selectedTurma).eq("ativo", true).order("nome");

    setAlunos(alunosData || []);

    const { data: existing } = await supabase
      .from("presencas").select("beneficiario_id, presente")
      .eq("turma_id", selectedTurma).eq("data", today);

    if (existing && existing.length > 0) {
      const map: Record<string, boolean> = {};
      existing.forEach((p) => { map[p.beneficiario_id] = p.presente; });
      setPresencas(map);
      setSaved(true);
    } else {
      const map: Record<string, boolean> = {};
      (alunosData || []).forEach((a) => { map[a.id] = true; });
      setPresencas(map);
    }
  };

  const togglePresenca = (alunoId: string) => {
    setSaved(false);
    setPresencas((prev) => ({ ...prev, [alunoId]: !prev[alunoId] }));
  };

  const salvarChamada = async () => {
    if (!user || !selectedTurma) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    await supabase.from("presencas").delete()
      .eq("turma_id", selectedTurma).eq("data", today).eq("registrado_por", user.id);

    const rows = alunos.map((a) => ({
      beneficiario_id: a.id, turma_id: selectedTurma, data: today,
      presente: presencas[a.id] ?? true, registrado_por: user.id,
    }));

    const { error } = await supabase.from("presencas").insert(rows);
    if (error) toast.error("Erro ao salvar chamada");
    else { toast.success("Chamada salva com sucesso!"); setSaved(true); }
    setSaving(false);
  };

  const marcarTodos = (presente: boolean) => {
    setSaved(false);
    const map: Record<string, boolean> = {};
    alunos.forEach((a) => { map[a.id] = presente; });
    setPresencas(map);
  };

  const totalPresentes = Object.values(presencas).filter(Boolean).length;
  const totalFaltas = alunos.length - totalPresentes;
  const turmaAtual = turmas.find((t) => t.id === selectedTurma);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Chamada Diária</h2>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <Select value={selectedTurma} onValueChange={setSelectedTurma}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a turma" />
        </SelectTrigger>
        <SelectContent>
          {turmas.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.nome} — {t.turno}
              {isTurmaToday(t.turno) ? " 🟢" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {turmaAtual && (
        <p className="text-xs text-muted-foreground">
          {isTurmaToday(turmaAtual.turno) 
            ? `✅ Turma do dia — ${turmaAtual.turno}` 
            : `⚠️ Esta turma não tem aula hoje (${turmaAtual.turno})`}
        </p>
      )}

      {selectedTurma && alunos.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge className="bg-success/10 text-success border-success/20" variant="outline">✓ {totalPresentes}</Badge>
              <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">✗ {totalFaltas}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => marcarTodos(true)} className="text-xs h-7">Todos P</Button>
              <Button size="sm" variant="outline" onClick={() => marcarTodos(false)} className="text-xs h-7">Todos F</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {alunos.map((aluno, idx) => (
              <Card key={aluno.id}
                className={`shadow-card cursor-pointer active:scale-[0.99] transition-transform ${presencas[aluno.id] ? "border-success/20" : "border-destructive/20"}`}
                onClick={() => togglePresenca(aluno.id)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox checked={presencas[aluno.id] ?? true}
                    onCheckedChange={() => togglePresenca(aluno.id)}
                    className="data-[state=checked]:bg-success data-[state=checked]:border-success" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{idx + 1}. {aluno.nome}</p>
                  </div>
                  <Badge variant="outline"
                    className={presencas[aluno.id]
                      ? "bg-success/10 text-success border-success/20 text-xs"
                      : "bg-destructive/10 text-destructive border-destructive/20 text-xs"}>
                    {presencas[aluno.id] ? "P" : "F"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="sticky bottom-16 z-40 pt-2">
            <Button onClick={salvarChamada} disabled={saving} className="w-full h-12 text-base font-semibold shadow-elevated">
              {saving ? "Salvando..." : saved ? <><CheckCircle className="w-5 h-5 mr-2" /> Chamada Salva</> : <><Save className="w-5 h-5 mr-2" /> Salvar Chamada</>}
            </Button>
          </div>
        </>
      )}

      {selectedTurma && alunos.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileChamada;
