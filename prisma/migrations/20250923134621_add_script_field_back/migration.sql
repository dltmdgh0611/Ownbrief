/*
  Warnings:

  - Made the column `script` on table `Podcast` required. This step will fail if there are existing NULL values in that column.

*/
-- 먼저 기존 NULL 값들을 기본값으로 설정
UPDATE "Podcast" SET "script" = '' WHERE "script" IS NULL;

-- 그 다음 NOT NULL 제약조건 추가
ALTER TABLE "Podcast" ALTER COLUMN "script" SET NOT NULL;
