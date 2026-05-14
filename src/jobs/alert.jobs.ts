import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { sendAlertEmail } from "../services/email.service.js";

export function startAlertJob(): void {
  cron.schedule("0 8 * * *", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await prisma.timelineEvent.findMany({
      where: {
        resolved: false,
        scheduled_for: { gte: today, lt: tomorrow },
      },
      include: { contract: { include: { workspace: { include: { users: { include: { user: true } } } } } } },
    });

    for (const event of events) {
      const users = event.contract.workspace.users.map((wu) => wu.user);
      for (const user of users) {
        await sendAlertEmail(
          user.email,
          `NexusDoc — Alerta: ${event.type}`,
          `${event.description}<br><br>Contrato: <strong>${event.contract.title}</strong>`
        );
      }

      await prisma.timelineEvent.update({
        where: { id: event.id },
        data: { resolved: true },
      });
    }
  });
}