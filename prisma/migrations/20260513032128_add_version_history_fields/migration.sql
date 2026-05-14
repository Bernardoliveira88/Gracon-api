-- AlterTable
ALTER TABLE "contract_versions" ADD COLUMN     "change_summary" TEXT,
ADD COLUMN     "uploaded_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
