-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);
