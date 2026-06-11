import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// =====================================================================
// BACKFILL — re-extrai value/start_date/end_date do raw_gemini_json
// ---------------------------------------------------------------------
// Contratos enviados antes do fix de parsing pt-BR ficaram com as
// colunas estruturadas null (parseFloat("R$ 84.000,00") = NaN;
// new Date("31/12/2026") = Invalid). Este script re-parseia o JSON
// bruto e preenche SÓ os campos que estão null — idempotente, seguro
// de rodar em todo boot.
// =====================================================================

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function parseMoney(raw?: string | number | null): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let s = raw.replace(/[^\d.,-]/g, '');
  if (!s) return null;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const br = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const date = br
    ? new Date(`${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}T00:00:00Z`)
    : new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

async function main() {
  const rows = await prisma.extractedData.findMany({
    where: {
      OR: [{ value: null }, { start_date: null }, { end_date: null }],
    },
  });

  let updated = 0;
  for (const row of rows) {
    const json = row.raw_gemini_json as Record<string, any> | null;
    if (!json) continue;

    const data: Record<string, unknown> = {};

    if (row.value == null) {
      const v = parseMoney(json?.valor?.total);
      if (v != null) data.value = v;
    }
    if (row.start_date == null) {
      const d = parseDate(json?.prazos?.inicio);
      if (d) data.start_date = d;
    }
    if (row.end_date == null) {
      const d = parseDate(json?.prazos?.termino);
      if (d) data.end_date = d;
    }

    if (Object.keys(data).length > 0) {
      await prisma.extractedData.update({ where: { id: row.id }, data });
      updated++;
    }
  }

  console.log(`[backfill] ${rows.length} registros verificados, ${updated} atualizados.`);
}

main()
  .catch((err) => {
    console.error('[backfill] falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
