-- CreateEnum
CREATE TYPE "PartyKind" AS ENUM ('CLIENT', 'SUPPLIER', 'PARTNER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "contract_parties" ADD COLUMN "party_id" TEXT;

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "kind" "PartyKind" NOT NULL DEFAULT 'CLIENT',
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parties_workspace_id_idx" ON "parties"("workspace_id");

-- CreateIndex
CREATE INDEX "parties_workspace_id_kind_idx" ON "parties"("workspace_id", "kind");

-- CreateIndex
CREATE INDEX "contract_parties_party_id_idx" ON "contract_parties"("party_id");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
