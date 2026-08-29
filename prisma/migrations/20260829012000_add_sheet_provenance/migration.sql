CREATE TYPE "SheetMusicProvenance" AS ENUM ('omr', 'demo', 'unknown');

ALTER TABLE "SheetMusic"
ADD COLUMN "provenance" "SheetMusicProvenance" NOT NULL DEFAULT 'unknown';

CREATE INDEX "SheetMusic_provenance_idx" ON "SheetMusic"("provenance");
