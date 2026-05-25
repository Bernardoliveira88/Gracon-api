import { prisma } from "../../../lib/prisma.js";
import type { ExtractedContractData } from "../../../types/contract.types.js";
import { EventType } from "@prisma/client";

interface TimelineEventInput {
  contract_id: string;
  type: EventType;
  scheduled_for: Date;
  description: string;
}

export async function generateTimeline(
  contractId: string,
  data: ExtractedContractData
): Promise<void> {
  const events: TimelineEventInput[] = [];

  // ── 1. VENCIMENTO ──────────────────────────────────────────────
  if (data.prazos.termino) {
    const terminoDate = new Date(data.prazos.termino);
    if (!isNaN(terminoDate.getTime())) {
      events.push({
        contract_id: contractId,
        type: EventType.EXPIRATION,
        scheduled_for: terminoDate,
        description: `Vencimento do contrato em ${formatDate(terminoDate)}.`,
      });

      // Alerta 30 dias antes do vencimento
      const alerta30 = subtractDays(terminoDate, 30);
      events.push({
        contract_id: contractId,
        type: EventType.CUSTOM,
        scheduled_for: alerta30,
        description: `Alerta: contrato vence em 30 dias (${formatDate(terminoDate)}).`,
      });

      // Alerta 7 dias antes do vencimento
      const alerta7 = subtractDays(terminoDate, 7);
      events.push({
        contract_id: contractId,
        type: EventType.CUSTOM,
        scheduled_for: alerta7,
        description: `Alerta urgente: contrato vence em 7 dias (${formatDate(terminoDate)}).`,
      });
    }
  }

  // ── 2. RENOVAÇÃO AUTOMÁTICA ────────────────────────────────────
  if (data.prazos.renovacaoAutomatica && data.prazos.termino) {
    const terminoDate = new Date(data.prazos.termino);
    if (!isNaN(terminoDate.getTime())) {
      // Evento de renovação no dia do vencimento
      events.push({
        contract_id: contractId,
        type: EventType.RENEWAL,
        scheduled_for: terminoDate,
        description: `Renovação automática prevista. Condição: ${data.prazos.renovacao ?? "conforme contrato"}.`,
      });

      // Alerta para decidir sobre renovação (30 dias antes)
      const alertaRenovacao = subtractDays(terminoDate, 30);
      events.push({
        contract_id: contractId,
        type: EventType.CUSTOM,
        scheduled_for: alertaRenovacao,
        description: `Decisão sobre renovação automática necessária em até 30 dias.`,
      });
    }
  }

  // ── 3. REAJUSTE ────────────────────────────────────────────────
  if (data.valor.dataReajuste) {
    const reajusteDate = new Date(data.valor.dataReajuste);
    if (!isNaN(reajusteDate.getTime())) {
      events.push({
        contract_id: contractId,
        type: EventType.PAYMENT,
        scheduled_for: reajusteDate,
        description: `Reajuste de valor previsto. Índice: ${data.valor.reajuste ?? "conforme contrato"}.`,
      });

      // Alerta 15 dias antes do reajuste
      const alertaReajuste = subtractDays(reajusteDate, 15);
      events.push({
        contract_id: contractId,
        type: EventType.CUSTOM,
        scheduled_for: alertaReajuste,
        description: `Alerta: reajuste contratual em 15 dias (${formatDate(reajusteDate)}).`,
      });
    }
  } else if (data.valor.reajuste) {
    // Reajuste existe mas sem data explícita — registra como evento informativo
    events.push({
      contract_id: contractId,
      type: EventType.PAYMENT,
      scheduled_for: new Date(), // data atual como referência
      description: `Reajuste previsto em contrato: ${data.valor.reajuste}. Data não especificada.`,
    });
  }

  // ── 4. INÍCIO DO CONTRATO ──────────────────────────────────────
  if (data.prazos.inicio) {
    const inicioDate = new Date(data.prazos.inicio);
    if (!isNaN(inicioDate.getTime())) {
      events.push({
        contract_id: contractId,
        type: EventType.CUSTOM,
        scheduled_for: inicioDate,
        description: `Início de vigência do contrato em ${formatDate(inicioDate)}.`,
      });
    }
  }

  // Salva todos os eventos de uma vez
  if (events.length > 0) {
    await prisma.timelineEvent.createMany({ data: events });
  }
}

// ── Helpers ────────────────────────────────────────────────────────
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}