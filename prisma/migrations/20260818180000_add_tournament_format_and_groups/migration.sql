-- AlterEnum
ALTER TYPE "TournamentStatus" ADD VALUE 'GROUP_STAGE';

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIMINATION', 'GROUPS_KO');

-- AlterTable
ALTER TABLE "Tournament"
  ADD COLUMN "format" "TournamentFormat" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
  ADD COLUMN "groupsCount" INTEGER,
  ADD COLUMN "qualifiersPerGroup" INTEGER;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Pair" ADD COLUMN "groupId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Group_tournamentId_index_key" ON "Group"("tournamentId", "index");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pair" ADD CONSTRAINT "Pair_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
