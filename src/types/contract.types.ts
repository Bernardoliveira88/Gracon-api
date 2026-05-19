export interface ExtractedContractData {
  titulo: string | null;

  partes: {
    contratante: string | null;
    contratado: string | null;
  };

  objeto: string | null;

  prazos: {
    inicio: string | null;
    termino: string | null;
    vigencia: string | null;
    prazoRelativo: string | null;
    renovacao: string | null;
    renovacaoAutomatica: boolean;
  };

  valor: {
    total: string | null;
    moeda: string | null;
    formaPagamento: string | null;
    reajuste: string | null;
    dataReajuste: string | null;
  };

  penalidades: {
    multaInadimplemento: string | null;
    multaRescisao: string | null;
    juros: string | null;
  };

  clausulasRelevantes: string[];
  alertas: string[];

  statusExtracao: "completo" | "parcial" | "insuficiente";
}

export interface PipelineResult {
  success: boolean;
  filename: string;
  fileUrl?: string;
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
