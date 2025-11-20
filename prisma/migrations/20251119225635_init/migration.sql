-- CreateTable
CREATE TABLE "Link" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_clicked" TIMESTAMP(3),

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_code_key" ON "Link"("code");
