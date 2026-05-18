import { prisma } from "../lib/prisma.js";

export async function getWorkspaceReportData(workspaceId: string) {
  const contracts = await prisma.contract.findMany({
    where: { workspace_id: workspaceId },
    include: {
      data: true,
      parties: true,
      approvals: { include: { user: true } },
      events: { orderBy: { scheduled_for: "asc" } },
    },
    orderBy: { created_at: "desc" },
  });

  return contracts.map((c) => ({
    id: c.id,
    titulo: c.title,
    status: c.status,
    criado_em: c.created_at.toLocaleDateString("pt-BR"),
    contratante: c.parties.find((p) => p.type === "CONTRACTOR")?.name ?? null,
    contratado: c.parties.find((p) => p.type === "HIRED")?.name ?? null,
    valor: c.data?.value ?? null,
    inicio: c.data?.start_date?.toLocaleDateString("pt-BR") ?? null,
    termino: c.data?.end_date?.toLocaleDateString("pt-BR") ?? null,
    renovacao_automatica: c.data?.auto_renewal ?? false,
    indice_reajuste: c.data?.readjustment_index ?? null,
    aprovacoes: c.approvals.map((a) => ({
      etapa: a.step,
      decisao: a.decision,
      responsavel: a.user.name,
      comentario: a.comment ?? null,
      data: a.decided_at.toLocaleDateString("pt-BR"),
    })),
    proximos_eventos: c.events
      .filter((e) => !e.resolved)
      .slice(0, 3)
      .map((e) => ({
        tipo: e.type,
        data: e.scheduled_for.toLocaleDateString("pt-BR"),
        descricao: e.description,
      })),
  }));
}