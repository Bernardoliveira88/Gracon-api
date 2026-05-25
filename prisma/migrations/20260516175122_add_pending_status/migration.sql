/*
  Warnings:

  - The `type` column on the `alert_configs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `change_summary` on the `contract_versions` table. All the data in the column will be lost.
  - You are about to drop the column `uploaded_by_id` on the `contract_versions` table. All the data in the column will be lost.
  - The `plan` column on the `workspaces` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updated_at` to the `alert_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `contract_clauses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `contract_notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `contract_parties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `extracted_data` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('EXPIRATION', 'RENEWAL', 'PAYMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ApprovalStep" AS ENUM ('LEGAL', 'FINANCE');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'PENDING_LEGAL';
ALTER TYPE "ContractStatus" ADD VALUE 'PENDING_FINANCE';
ALTER TYPE "ContractStatus" ADD VALUE 'IN_REVIEW';

-- DropForeignKey
ALTER TABLE "contract_versions" DROP CONSTRAINT IF EXISTS "contract_versions_uploaded_by_id_fkey";

-- AlterTable
ALTER TABLE "alert_configs" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "alerts" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "contract_clauses" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "contract_notes" 
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "contract_parties" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "contract_tags" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "contract_versions" 
DROP COLUMN IF EXISTS "change_summary",
DROP COLUMN IF EXISTS "uploaded_by_id";

-- AlterTable
ALTER TABLE "extracted_data" 
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "workspaces" 
DROP COLUMN IF EXISTS "plan";
ALTER TABLE "workspaces"
ADD COLUMN IF NOT EXISTS "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE IF NOT EXISTS "contract_approvals" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step" "ApprovalStep" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comment" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contract_approvals_contract_id_idx" ON "contract_approvals"("contract_id");

-- AddForeignKey
ALTER TABLE "contract_approvals" ADD CONSTRAINT "contract_approvals_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_approvals" ADD CONSTRAINT "contract_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;