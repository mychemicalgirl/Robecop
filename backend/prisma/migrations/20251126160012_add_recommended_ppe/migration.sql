-- CreateTable
CREATE TABLE "RecommendedPpe" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "riskId" INTEGER NOT NULL,
    "ppeId" INTEGER NOT NULL,

    CONSTRAINT "RecommendedPpe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendedPpe_roleId_riskId_ppeId_key" ON "RecommendedPpe"("roleId", "riskId", "ppeId");

-- AddForeignKey
ALTER TABLE "RecommendedPpe" ADD CONSTRAINT "RecommendedPpe_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedPpe" ADD CONSTRAINT "RecommendedPpe_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedPpe" ADD CONSTRAINT "RecommendedPpe_ppeId_fkey" FOREIGN KEY ("ppeId") REFERENCES "PpeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
