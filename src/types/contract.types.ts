export interface ExtractedContractData {
  titulo: string | null;
  partes: {
    contratante: string | null;
    contratado: string | null;
  };
  objeto: string | null;
  prazos: {
    inicio: string | null;      // ISO 8601 quando possível
    termino: string | null;
    vigencia: string | null;    // ex: "12 meses"
    renovacao: string | null;
  };
  valor: {
    total: string | null;
    moeda: string | null;
    formaPagamento: string | null;
  };
  clausulasRelevantes: string[];
  alertas: string[];            // prazos próximos, cláusulas de atenção
}

export interface PipelineResult {
  success: boolean;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  extractedData?: ExtractedContractData;
  rawGeminiResponse?: string;
  error?: string;
}

export interface UploadContractReply {
  ok: boolean;
  data?: PipelineResult;
  message?: string;
}
