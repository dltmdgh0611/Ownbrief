-- 고아 레코드 삭제 (User 테이블에 없는 userId를 가진 UserSettings)
DELETE FROM "UserSettings" 
WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
