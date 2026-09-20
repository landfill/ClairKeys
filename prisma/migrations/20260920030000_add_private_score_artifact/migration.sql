CREATE TABLE "SheetScoreArtifact" (
    "sheetMusicId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    CONSTRAINT "SheetScoreArtifact_pkey" PRIMARY KEY ("sheetMusicId"),
    CONSTRAINT "SheetScoreArtifact_sheetMusicId_fkey" FOREIGN KEY ("sheetMusicId") REFERENCES "SheetMusic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Supabase exposes public-schema tables through PostgREST. With no policies,
-- RLS denies anon/authenticated access; the server database role owns access.
ALTER TABLE "SheetScoreArtifact" ENABLE ROW LEVEL SECURITY;
