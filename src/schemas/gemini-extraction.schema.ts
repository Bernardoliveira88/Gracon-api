import { z } from 'zod';

/**
 * Schema canônico (single-source-of-truth) da resposta esperada do Gemini
 * para extração de dados de contratos. O frontend espelha esse formato em
 * `types/gemini.ts`.
 *
 * Mantenha sincronizado com o prompt em `src/services/gemini.service.ts`
 * (constante EXTRACTION_PROMPT). Se alterar o prompt, atualize aqui também.
 */

const NullableString = z.string().nullable();

export const PartesSchema = z.object({
  contratante: NullableString,
  contratado: NullableString,
});

export const PrazosSchema = z.object({
  inicio: NullableString,
  termino: NullableString,
  vigencia: NullableString,
  prazoRelativo: NullableString,
  renovacao: NullableString,
  renovacaoAutomatica: z.boolean(),
});

export const ValorSchema = z.object({
  total: NullableString,
  moeda: NullableString,
  formaPagamento: NullableString,
  reajuste: NullableString,
  dataReajuste: NullableString,
});

export const PenalidadesSchema = z.object({
  multaInadimplemento: NullableString,
  multaRescisao: NullableString,
  juros: NullableString,
});

export const GeminiExtractionSchema = z.object({
  titulo: NullableString,
  partes: PartesSchema,
  objeto: NullableString,
  prazos: PrazosSchema,
  valor: ValorSchema,
  penalidades: PenalidadesSchema,
  clausulasRelevantes: z.array(z.string()),
  alertas: z.array(z.string()),
  statusExtracao: z.enum(['completo', 'parcial', 'insuficiente']),
});

export type GeminiExtraction = z.infer<typeof GeminiExtractionSchema>;
export type GeminiPartes = z.infer<typeof PartesSchema>;
export type GeminiPrazos = z.infer<typeof PrazosSchema>;
export type GeminiValor = z.infer<typeof ValorSchema>;
export type GeminiPenalidades = z.infer<typeof PenalidadesSchema>;

/**
 * Versão tolerante usada para validar a resposta crua do Gemini sem
 * bloquear o pipeline. Aceita objetos parciais e devolve um relatório de
 * problemas (campos faltantes/divergentes) para logging.
 */
export function safeValidateGeminiExtraction(value: unknown): {
  success: boolean;
  data?: GeminiExtraction;
  issues?: string[];
} {
  const parsed = GeminiExtractionSchema.safeParse(value);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  const issues = parsed.error.issues.map(
    (i) => `${i.path.join('.') || '<root>'}: ${i.message}`,
  );
  return { success: false, issues };
}
