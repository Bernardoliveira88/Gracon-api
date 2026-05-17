import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import Papa from "papaparse";
import PDFDocument from "pdfkit";
import { getWorkspaceReportData } from "../../../services/report.service.js";

const querySchema = z.object({
  workspace_id: z.string().uuid(),
  format: z.enum(["csv", "pdf"]),
});

export async function exportReport(request: FastifyRequest, reply: FastifyReply) {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Informe workspace_id e format (csv ou pdf)." });
  }

  const { workspace_id, format } = parsed.data;
  const contracts = await getWorkspaceReportData(workspace_id);

  if (contracts.length === 0) {
    return reply.status(404).send({ message: "Nenhum contrato encontrado." });
  }

  if (format === "csv") {
    const flat = contracts.map((c) => ({
      ID: c.id,
      Título: c.titulo,
      Status: c.status,
      Criado_em: c.criado_em,
      Contratante: c.contratante,
      Contratado: c.contratado,
      Valor: c.valor,
      Início: c.inicio,
      Término: c.termino,
      Renovação_automática: c.renovacao_automatica ? "Sim" : "Não",
      Índice_reajuste: c.indice_reajuste,
    }));

    const csv = Papa.unparse(flat, { delimiter: ";", header: true });
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", "attachment; filename=relatorio.csv");
    return reply.send("\uFEFF" + csv);
  }

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on("end", resolve);

    doc.fontSize(18).font("Helvetica-Bold").text("NexusDoc — Relatório de Contratos", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(1.5);

    for (const c of contracts) {
      doc.fontSize(13).font("Helvetica-Bold").text(c.titulo ?? "Sem título");
      doc.fontSize(9).font("Helvetica");
      doc.text(`Status: ${c.status}  |  Criado em: ${c.criado_em}`);
      doc.text(`Contratante: ${c.contratante ?? "—"}  |  Contratado: ${c.contratado ?? "—"}`);
      doc.text(`Valor: ${c.valor ? `R$ ${c.valor.toLocaleString("pt-BR")}` : "—"}  |  Início: ${c.inicio ?? "—"}  |  Término: ${c.termino ?? "—"}`);
      doc.text(`Renovação automática: ${c.renovacao_automatica ? "Sim" : "Não"}  |  Reajuste: ${c.indice_reajuste ?? "—"}`);

      if (c.aprovacoes.length > 0) {
        doc.moveDown(0.3).font("Helvetica-Bold").text("Aprovações:");
        doc.font("Helvetica");
        for (const a of c.aprovacoes) {
          doc.text(`  • ${a.etapa}: ${a.decisao} — ${a.responsavel} em ${a.data}`);
        }
      }

      if (c.proximos_eventos.length > 0) {
        doc.moveDown(0.3).font("Helvetica-Bold").text("Próximos eventos:");
        doc.font("Helvetica");
        for (const e of c.proximos_eventos) {
          doc.text(`  • ${e.tipo} em ${e.data}: ${e.descricao}`);
        }
      }

      doc.moveDown(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke().moveDown(0.5);
    }

    doc.end();
  });

  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", "attachment; filename=relatorio.pdf");
  return reply.send(Buffer.concat(buffers));
}