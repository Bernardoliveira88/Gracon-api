/*
  Warnings:

  - You are about to drop the `Alert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlertConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contract` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractClause` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractParty` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExtractedData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TimelineEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Workspace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkspaceUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'LEGAL', 'FINANCE', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PROCESSING', 'ACTIVE', 'EXPIRING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CONTRACTOR', 'HIRED');

-- CreateEnum
CREATE TYPE "ClauseType" AS ENUM ('OBLIGATION', 'PENALTY', 'TERMINATION', 'GENERAL');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('RENEWAL', 'EXPIRATION', 'PAYMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'PUSH', 'SMS');

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_user_id_fkey";

-- DropForeignKey
ALTER TABLE "AlertConfig" DROP CONSTRAINT "AlertConfig_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractClause" DROP CONSTRAINT "ContractClause_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractNote" DROP CONSTRAINT "ContractNote_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractNote" DROP CONSTRAINT "ContractNote_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractParty" DROP CONSTRAINT "ContractParty_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractTag" DROP CONSTRAINT "ContractTag_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "ContractVersion" DROP CONSTRAINT "ContractVersion_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "ExtractedData" DROP CONSTRAINT "ExtractedData_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "TimelineEvent" DROP CONSTRAINT "TimelineEvent_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceUser" DROP CONSTRAINT "WorkspaceUser_user_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceUser" DROP CONSTRAINT "WorkspaceUser_workspace_id_fkey";

-- DropTable
DROP TABLE "Alert";

-- DropTable
DROP TABLE "AlertConfig";

-- DropTable
DROP TABLE "Contract";

-- DropTable
DROP TABLE "ContractClause";

-- DropTable
DROP TABLE "ContractNote";

-- DropTable
DROP TABLE "ContractParty";

-- DropTable
DROP TABLE "ContractTag";

-- DropTable
DROP TABLE "ContractVersion";

-- DropTable
DROP TABLE "ExtractedData";

-- DropTable
DROP TABLE "Invite";

-- DropTable
DROP TABLE "TimelineEvent";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Workspace";

-- DropTable
DROP TABLE "WorkspaceUser";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_users" (
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("user_id","workspace_id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PROCESSING',
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_data" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "value" DOUBLE PRECISION,
    "readjustment_index" TEXT,
    "readjustment_date" TIMESTAMP(3),
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "notice_days" INTEGER,
    "raw_gemini_json" JSONB,

    CONSTRAINT "extracted_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_parties" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "type" "PartyType" NOT NULL,

    CONSTRAINT "contract_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_clauses" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "type" "ClauseType" NOT NULL,
    "content" TEXT NOT NULL,
    "page_ref" INTEGER,

    CONSTRAINT "contract_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "version_num" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_notes" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_tags" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "contract_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "days_before" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3),
    "channel" "AlertChannel" NOT NULL DEFAULT 'EMAIL',

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "days_before" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_workspace_id_idx" ON "invites"("workspace_id");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE INDEX "contracts_workspace_id_idx" ON "contracts"("workspace_id");

-- CreateIndex
CREATE INDEX "contracts_workspace_id_status_idx" ON "contracts"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_data_contract_id_key" ON "extracted_data"("contract_id");

-- CreateIndex
CREATE INDEX "contract_parties_contract_id_idx" ON "contract_parties"("contract_id");

-- CreateIndex
CREATE INDEX "contract_clauses_contract_id_idx" ON "contract_clauses"("contract_id");

-- CreateIndex
CREATE INDEX "contract_versions_contract_id_idx" ON "contract_versions"("contract_id");

-- CreateIndex
CREATE INDEX "contract_notes_contract_id_idx" ON "contract_notes"("contract_id");

-- CreateIndex
CREATE INDEX "contract_tags_contract_id_idx" ON "contract_tags"("contract_id");

-- CreateIndex
CREATE INDEX "timeline_events_contract_id_idx" ON "timeline_events"("contract_id");

-- CreateIndex
CREATE INDEX "timeline_events_scheduled_for_idx" ON "timeline_events"("scheduled_for");

-- CreateIndex
CREATE INDEX "alerts_user_id_idx" ON "alerts"("user_id");

-- CreateIndex
CREATE INDEX "alerts_contract_id_idx" ON "alerts"("contract_id");

-- CreateIndex
CREATE INDEX "alert_configs_workspace_id_idx" ON "alert_configs"("workspace_id");

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_clauses" ADD CONSTRAINT "contract_clauses_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_notes" ADD CONSTRAINT "contract_notes_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_notes" ADD CONSTRAINT "contract_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_tags" ADD CONSTRAINT "contract_tags_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
