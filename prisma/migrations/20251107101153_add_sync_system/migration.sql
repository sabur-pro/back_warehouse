/*
  Warnings:

  - You are about to drop the column `boss_id` on the `assistants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[admin_id]` on the table `assistants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `admin_id` to the `assistants` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PendingActionType" AS ENUM ('UPDATE_ITEM', 'DELETE_ITEM', 'DELETE_TRANSACTION');

-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "assistants" DROP CONSTRAINT "assistants_boss_id_fkey";

-- AlterTable (переименование колонки вместо удаления)
ALTER TABLE "assistants" RENAME COLUMN "boss_id" TO "admin_id";

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "number_of_boxes" INTEGER NOT NULL DEFAULT 1,
    "box_size_quantities" TEXT NOT NULL,
    "size_type" TEXT NOT NULL,
    "item_type" TEXT NOT NULL DEFAULT 'обувь',
    "row" TEXT,
    "position" TEXT,
    "side" TEXT,
    "image_url" TEXT,
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qr_code_type" TEXT NOT NULL DEFAULT 'none',
    "qr_codes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "item_id" INTEGER,
    "action" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "details" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_actions" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "assistant_id" INTEGER NOT NULL,
    "action_type" "PendingActionType" NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'PENDING',
    "item_id" INTEGER,
    "transaction_id" INTEGER,
    "old_data" TEXT NOT NULL,
    "new_data" TEXT NOT NULL,
    "reason" TEXT,
    "admin_comment" TEXT,
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_info" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_states" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_type" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3) NOT NULL,
    "last_item_version" INTEGER NOT NULL DEFAULT 0,
    "last_transaction_id" INTEGER NOT NULL DEFAULT 0,
    "last_pending_action_id" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_admin_id_idx" ON "items"("admin_id");

-- CreateIndex
CREATE INDEX "items_admin_id_is_deleted_idx" ON "items"("admin_id", "is_deleted");

-- CreateIndex
CREATE INDEX "items_updated_at_idx" ON "items"("updated_at");

-- CreateIndex
CREATE INDEX "transactions_admin_id_idx" ON "transactions"("admin_id");

-- CreateIndex
CREATE INDEX "transactions_admin_id_timestamp_idx" ON "transactions"("admin_id", "timestamp");

-- CreateIndex
CREATE INDEX "transactions_timestamp_idx" ON "transactions"("timestamp");

-- CreateIndex
CREATE INDEX "pending_actions_admin_id_status_idx" ON "pending_actions"("admin_id", "status");

-- CreateIndex
CREATE INDEX "pending_actions_assistant_id_status_idx" ON "pending_actions"("assistant_id", "status");

-- CreateIndex
CREATE INDEX "pending_actions_status_expires_at_idx" ON "pending_actions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "pending_actions_created_at_idx" ON "pending_actions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_user_type_is_active_idx" ON "push_tokens"("user_id", "user_type", "is_active");

-- CreateIndex
CREATE INDEX "sync_states_user_id_user_type_idx" ON "sync_states"("user_id", "user_type");

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_user_id_user_type_device_id_key" ON "sync_states"("user_id", "user_type", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "assistants_admin_id_key" ON "assistants"("admin_id");

-- AddForeignKey
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "assistants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
