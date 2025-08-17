-- DropForeignKey
ALTER TABLE "public"."ProcessingJob" DROP CONSTRAINT "ProcessingJob_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProcessingNotification" DROP CONSTRAINT "ProcessingNotification_jobId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProcessingNotification" DROP CONSTRAINT "ProcessingNotification_userId_fkey";

-- AlterTable
ALTER TABLE "public"."SheetMusic" ADD COLUMN     "omrJobId" TEXT,
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'pending';

-- AddForeignKey
ALTER TABLE "public"."ProcessingJob" ADD CONSTRAINT "ProcessingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProcessingNotification" ADD CONSTRAINT "ProcessingNotification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProcessingNotification" ADD CONSTRAINT "ProcessingNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
