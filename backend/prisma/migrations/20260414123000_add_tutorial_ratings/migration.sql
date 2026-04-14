-- CreateTable
CREATE TABLE "TutorialRating" (
    "userId" TEXT NOT NULL,
    "tutorialId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorialRating_pkey" PRIMARY KEY ("userId","tutorialId"),
    CONSTRAINT "TutorialRating_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE INDEX "TutorialRating_tutorialId_idx" ON "TutorialRating"("tutorialId");

-- AddForeignKey
ALTER TABLE "TutorialRating" ADD CONSTRAINT "TutorialRating_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorialRating" ADD CONSTRAINT "TutorialRating_tutorialId_fkey"
FOREIGN KEY ("tutorialId") REFERENCES "Tutorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
