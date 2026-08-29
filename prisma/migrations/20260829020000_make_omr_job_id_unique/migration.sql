-- Each OMR service job is generated as a UUID and belongs to at most one score.
-- PostgreSQL permits multiple NULL values in this unique index, so rows before
-- the OMR service has returned a job identifier remain valid.
CREATE UNIQUE INDEX "SheetMusic_omrJobId_key" ON "SheetMusic"("omrJobId");
