CREATE TABLE "TutorialView" (
    "userId" TEXT NOT NULL,
    "tutorialId" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorialView_pkey" PRIMARY KEY ("userId","tutorialId")
);

CREATE INDEX "TutorialView_lastViewedAt_idx" ON "TutorialView"("lastViewedAt");

ALTER TABLE "TutorialView"
ADD CONSTRAINT "TutorialView_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TutorialView"
ADD CONSTRAINT "TutorialView_tutorialId_fkey"
FOREIGN KEY ("tutorialId") REFERENCES "Tutorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
