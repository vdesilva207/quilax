import prisma from "../lib/prisma.js";

async function main() {
  await prisma.quiz.createMany({
    data: [
      { question: "2+2", answer: "4" },
      { question: "Capital de Francia", answer: "Paris" },
    ],
  });
}

main()
  .then(() => {
    console.log("Seed done.");
  })
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
