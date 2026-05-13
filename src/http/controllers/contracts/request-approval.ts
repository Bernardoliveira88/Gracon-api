import { prisma } from "../../../lib/prisma.js";
import { sendAlertEmail } from "../../../services/email.service.js";

export async function requestApproval(contractId: string): Promise<void> {
  await prisma.contract.update({
    where: { id: contractId },
    data: { status: "PENDING_LEGAL" },
  });

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      workspace: {
        include: {
          users: {
            where: { role: "LEGAL" },
            include: { user: true },
          },
        },
      },
    },
  });

  if (!contract) return;

  for (const wu of contract.workspace.users) {
    await sendAlertEmail(
      wu.user.email,
      `NexusDoc — Aprovação jurídica necessária`,
      `O contrato <strong>${contract.title}</strong> aguarda sua aprovação jurídica. Acesse o sistema para revisar e decidir.`
    );
  }
}