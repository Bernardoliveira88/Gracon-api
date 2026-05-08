import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.js";
import { PdfService } from "../../../services/pdf.service.js";
import { GeminiService } from "../../../services/gemini.service.js";
import { generateTimeline } from "./timeline.js";

const pdfService = new PdfService();
const geminiService = new GeminiService(process.env.GEMINI_API_KEY ?? "");

const uploadBodySchema = z.object({
  workspace_id: z.string().uuid(),
});

export async function uploadContract(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parts = request.parts();

  let workspaceId: string | null = null;
  let uploadedFile = null;

  for await (const part of parts) {
    if (part.type === "field" && part.fieldname === "workspace_id") {
      workspaceId = part.value as string;
    } else if (part.type === "file" && part.fieldname === "file") {
      uploadedFile = part;
    }
  }

  if (!uploadedFile) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado. Use o campo "file".' });
  }

  const parsed = uploadBodySchema.safeParse({ workspace_id: workspaceId });
  if (!parsed.success) {
    return reply.status(400).send({ message: "workspace_id inválido ou ausente." });
  }

  try {
    const pdf = await pdfService.readFromMultipart(uploadedFile);

    const { extracted, raw } = await geminiService.extractContractData(
      pdf.base64,
      pdf.mimeType
    );

    const contract = await prisma.contract.create({
      data: {
        workspace_id: parsed.data.workspace_id,
        title: extracted.titulo ?? pdf.filename,
        status: "active",
        file_url: pdf.filename,
      },
    });

    await prisma.extractedData.create({
      data: {
        contract_id: contract.id,
        start_date: extracted.prazos.inicio ? new Date(extracted.prazos.inicio) : null,
        end_date: extracted.prazos.termino ? new Date(extracted.prazos.termino) : null,
        value: extracted.valor.total ? parseFloat(extracted.valor.total) : null,
        readjustment_index: extracted.valor.reajuste ?? null,
        readjustment_date: extracted.valor.dataReajuste
          ? new Date(extracted.valor.dataReajuste)
          : null,
        auto_renewal: extracted.prazos.renovacaoAutomatica ?? false,
        raw_gemini_json: JSON.parse(raw),
      },
    });

    const parties = [];
    if (extracted.partes.contratante) {
      parties.push({ contract_id: contract.id, name: extracted.partes.contratante, type: "contractor" });
    }
    if (extracted.partes.contratado) {
      parties.push({ contract_id: contract.id, name: extracted.partes.contratado, type: "hired" });
    }
    if (parties.length > 0) {
      await prisma.contractParty.createMany({ data: parties });
    }

    await generateTimeline(contract.id, extracted);

    const timeline = await prisma.timelineEvent.findMany({
      where: { contract_id: contract.id },
      orderBy: { scheduled_for: "asc" },
    });

    return reply.status(201).send({
      ok: true,
      contract: {
        id: contract.id,
        title: contract.title,
        status: contract.status,
      },
      extractedData: extracted,
      timeline,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";

    const isClientError =
      message.includes("Tipo de arquivo inválido") ||
      message.includes("arquivo vazio") ||
      message.includes("arquivo muito grande") ||
      message.includes("não é um PDF válido") ||
      message.includes("não parece ser um contrato");

    return reply.status(isClientError ? 400 : 500).send({ ok: false, message });
  }
}