import { ContractStatus, PartyType } from '@prisma/client';

/**
 * Status simplificado consumido pela UI (snake_case lowercase).
 * Mantém compatibilidade com o frontend legado mas expõe todos os estados
 * que o backend de fato modela.
 */
export type ContractStatusUi =
  | 'processing'
  | 'pending_legal'
  | 'pending_finance'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'in_review';

/**
 * Tipo de parte normalizado para a UI. Mapping 1:1 com o enum Prisma —
 * apenas converte para lowercase para uniformidade com `ContractStatusUi`.
 */
export type PartyTypeUi = 'contractor' | 'hired';

const CONTRACT_STATUS_TO_UI: Record<ContractStatus, ContractStatusUi> = {
  PROCESSING: 'processing',
  PENDING_LEGAL: 'pending_legal',
  PENDING_FINANCE: 'pending_finance',
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
  IN_REVIEW: 'in_review',
};

const PARTY_TYPE_TO_UI: Record<PartyType, PartyTypeUi> = {
  CONTRACTOR: 'contractor',
  HIRED: 'hired',
};

export function mapContractStatusToUi(status: ContractStatus): ContractStatusUi {
  return CONTRACT_STATUS_TO_UI[status];
}

export function mapPartyTypeToUi(type: PartyType): PartyTypeUi {
  return PARTY_TYPE_TO_UI[type];
}
