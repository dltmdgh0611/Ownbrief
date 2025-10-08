-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
