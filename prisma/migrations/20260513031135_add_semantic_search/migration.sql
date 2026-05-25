-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "contract_embeddings" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "content_text" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_embeddings_contract_id_key" ON "contract_embeddings"("contract_id");

-- AddForeignKey
ALTER TABLE "contract_embeddings" ADD CONSTRAINT "contract_embeddings_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
