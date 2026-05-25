import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.js";
import { sendAlertEmail } from "../../../services/email.service.js";

const decideBodySchema = z.object({
  user_id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
});

const decideParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function decideApproval(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = decideParamsSchema.safeParse(request.params);
  const body = decideBodySchema.safeParse(request.body);

  if (!params.success || !body.success) {
    return reply.status(400).send({ message: "Dados inválidos." });
  }

  const { id: contractId } = params.data;
  const { user_id, decision, comment } = body.data;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      workspace: {
        include: {
          users: { include: { user: true } },
        },
      },
    },
  });

  if (!contract) {
    return reply.status(404).send({ message: "Contrato não encontrado." });
  }

  const stepMap: Record<string, "LEGAL" | "FINANCE"> = {
    PENDING_LEGAL: "LEGAL",
    PENDING_FINANCE: "FINANCE",
  };

  const currentStep = stepMap[contract.status];
  if (!currentStep) {
    return reply.status(400).send({ message: "Contrato não está aguardando aprovação." });
  }

  // Registra a decisão
  await prisma.contractApproval.create({
    data: {
      contract_id: contractId,
      user_id,
      step: currentStep,
      decision,
      comment,
    },
  });

  const allUsers = contract.workspace.users.map((wu) => wu.user);

  if (decision === "REJECTED") {
    // Volta para revisão
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: "IN_REVIEW" },
    });

    // Notifica todos do workspace
    for (const user of allUsers) {
      await sendAlertEmail(
        user.email,
        `NexusDoc — Contrato retornou para revisão`,
        `O contrato <strong>${contract.title}</strong> foi rejeitado na etapa <strong>${currentStep}</strong> e retornou para revisão. ${comment ? `Motivo: ${comment}` : ""}`
      );
    }

    return reply.status(200).send({ ok: true, status: "IN_REVIEW" });
  }

  if (currentStep === "LEGAL") {
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: "PENDING_FINANCE" },
    });

    const financeUsers = contract.workspace.users
      .filter((wu) => wu.role === "FINANCE")
      .map((wu) => wu.user);

    for (const user of financeUsers) {
      await sendAlertEmail(
        user.email,
        `NexusDoc — Aprovação financeira necessária`,
        `O contrato <strong>${contract.title}</strong> foi aprovado pelo jurídico e aguarda sua aprovação financeira.`
      );
    }

    return reply.status(200).send({ ok: true, status: "PENDING_FINANCE" });
  }

  if (currentStep === "FINANCE") {
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: "ACTIVE" },
    });

    for (const user of allUsers) {
      await sendAlertEmail(
        user.email,
        `NexusDoc — Contrato aprovado`,
        `O contrato <strong>${contract.title}</strong> foi totalmente aprovado e está agora ativo.`
      );
    }

    return reply.status(200).send({ ok: true, status: "ACTIVE" });
  }
}