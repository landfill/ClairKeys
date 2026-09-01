-- Keep the authenticated library lookup on one user-scoped ordered index.
CREATE INDEX "SheetMusic_userId_updatedAt_idx"
ON "SheetMusic"("userId", "updatedAt");

-- Cover the default public browse/search predicate and newest ordering.
CREATE INDEX "SheetMusic_isPublic_provenance_createdAt_idx"
ON "SheetMusic"("isPublic", "provenance", "createdAt");

-- Support category filter counts without scanning every sheet music row.
CREATE INDEX "SheetMusic_categoryId_isPublic_provenance_idx"
ON "SheetMusic"("categoryId", "isPublic", "provenance");
