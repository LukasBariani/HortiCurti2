ALTER TABLE "Client" ADD COLUMN "defaultMarkupPercent" DOUBLE PRECISION;
ALTER TABLE "Client" ADD CONSTRAINT "Client_defaultMarkupPercent_check"
CHECK ("defaultMarkupPercent" IS NULL OR ("defaultMarkupPercent" >= 0 AND "defaultMarkupPercent" < 'Infinity'::float8));
