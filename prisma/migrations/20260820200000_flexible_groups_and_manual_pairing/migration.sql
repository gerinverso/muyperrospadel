-- CreateEnum
CREATE TYPE "PairingMode" AS ENUM ('DRAW', 'MANUAL');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "qualifiers" INTEGER,
ADD COLUMN     "tiebreakOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "pairingMode" "PairingMode" NOT NULL DEFAULT 'DRAW';

