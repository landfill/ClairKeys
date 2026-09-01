-- PostgreSQL forbids CREATE INDEX CONCURRENTLY inside a transaction. Keep this
-- custom Prisma migration free of BEGIN/COMMIT so migrate deploy executes each
-- statement sequentially without write-blocking index builds.

-- Keep the authenticated library lookup on one user-scoped ordered index.
CREATE INDEX CONCURRENTLY "SheetMusic_userId_updatedAt_idx"
ON "SheetMusic"("userId", "updatedAt");

-- Keep the equality key before the public newest ordering. Provenance is an
-- inequality predicate and remains a filter rather than breaking the sort key.
CREATE INDEX CONCURRENTLY "SheetMusic_isPublic_createdAt_idx"
ON "SheetMusic"("isPublic", "createdAt");

-- Support category filter counts without scanning every sheet music row.
CREATE INDEX CONCURRENTLY "SheetMusic_categoryId_isPublic_provenance_idx"
ON "SheetMusic"("categoryId", "isPublic", "provenance");
