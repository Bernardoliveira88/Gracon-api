/*
  Warnings:

  - The `type` column on the `alert_configs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "alert_configs" DROP COLUMN "type",
ADD COLUMN     "type" "AlertType" NOT NULL DEFAULT 'CUSTOM',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alerts" DROP COLUMN "type",
ADD COLUMN     "type" "AlertType" NOT NULL DEFAULT 'CUSTOM',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contract_clauses" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contract_notes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contract_parties" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "extracted_data" ALTER COLUMN "updated_at" DROP DEFAULT;
