-- DropIndex
DROP INDEX "sources_search_vector_idx";

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "lastVisitedAt" TIMESTAMP(3);
