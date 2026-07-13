import request from "supertest";
import app from "../src/index.js";
import prisma from "../src/lib/prisma.js";

describe("PAYMENTS SYSTEM TESTS", () => {
  let testUser, authToken, adminToken;

  beforeAll(async () => {
    // Crear usuario de prueba
    const userRes = await request(app)
      .post("/auth/register")
      .send({
        email: "paymenttest@example.com",
        password: "password123"
      });

    testUser = userRes.body.user;
    authToken = userRes.body.token;

    // Crear admin de prueba
    const adminRes = await request(app)
      .post("/auth/register")
      .send({
        email: "adminpayment@example.com",
        password: "admin123"
      });

    // Promover a admin
    await prisma.user.update({
      where: { id: adminRes.body.user.id },
      data: { role: "ADMIN" }
    });

    adminToken = adminRes.body.token;
  });

  describe("Credit Purchase", () => {
    it("should get available packages", async () => {
      const res = await request(app)
        .get("/payments/packages")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.packages).toBeDefined();
      expect(res.body.packages.length).toBeGreaterThan(0);
      
      // Verificar estructura de paquetes
      const pkg = res.body.packages[0];
      expect(pkg).toHaveProperty('credits');
      expect(pkg).toHaveProperty('bonus');
      expect(pkg).toHaveProperty('totalCredits');
      expect(pkg).toHaveProperty('priceEuros');
    });

    it("should create payment intent for credits", async () => {
      const res = await request(app)
        .post("/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ credits: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paymentIntent).toHaveProperty('clientSecret');
      expect(res.body.paymentIntent).toHaveProperty('paymentIntentId');
      expect(res.body.paymentIntent).toHaveProperty('credits');
      expect(res.body.paymentIntent.credits).toBe(12); // 10 + 2 bonus
    });

    it("should reject invalid credit amounts", async () => {
      const res = await request(app)
        .post("/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ credits: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('inválida');
    });

    it("should reject non-existent packages", async () => {
      const res = await request(app)
        .post("/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ credits: 999 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('válido');
    });
  });

  describe("Bank Account Verification", () => {
    it("should update bank account", async () => {
      const res = await request(app)
        .post("/payments/bank-account")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          iban: "ES9121000418450200051332",
          accountName: "Test User",
          bic: "CAIXESBBXXX"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('correctamente');
    });

    it("should reject invalid IBAN", async () => {
      const res = await request(app)
        .post("/payments/bank-account")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          iban: "INVALID_IBAN",
          accountName: "Test User"
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('válido');
    });

    it("should get masked bank account info", async () => {
      const res = await request(app)
        .get("/payments/bank-account")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bankAccount).toHaveProperty('iban');
      expect(res.body.bankAccount.iban).toMatch(/^\*+\d{4}$/); // Masked IBAN
      expect(res.body.bankAccount).toHaveProperty('isVerified');
    });
  });

  describe("Age Verification", () => {
    it("should verify adult user", async () => {
      const adultDate = new Date();
      adultDate.setFullYear(adultDate.getFullYear() - 25);

      const res = await request(app)
        .post("/payments/age-verification")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          dateOfBirth: adultDate.toISOString().split('T')[0]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isOver18).toBe(true);
    });

    it("should detect minor user", async () => {
      const minorDate = new Date();
      minorDate.setFullYear(minorDate.getFullYear() - 16);

      const res = await request(app)
        .post("/payments/age-verification")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          dateOfBirth: minorDate.toISOString().split('T')[0],
          guardianPhotoUrl: "http://example.com/guardian.jpg",
          verificationVideoUrl: "http://example.com/video.mp4"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isOver18).toBe(false);
    });

    it("should get verification status", async () => {
      const res = await request(app)
        .get("/payments/verification-status")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verification).toHaveProperty('isAgeVerified');
      expect(res.body.verification).toHaveProperty('isOver18');
      expect(res.body.verification).toHaveProperty('isBankVerified');
    });
  });

  describe("Withdrawals", () => {
    beforeEach(async () => {
      // Añadir créditos al usuario para pruebas de retiro
      await prisma.user.update({
        where: { id: testUser.id },
        data: { balance: 100 }
      });
    });

    it("should create withdraw request", async () => {
      const res = await request(app)
        .post("/withdraws/request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.withdraw).toHaveProperty('id');
      expect(res.body.withdraw.amount).toBe(10);
      expect(res.body.processingFee).toBeGreaterThan(0);
      expect(res.body.totalAmount).toBeGreaterThan(10);
    });

    it("should reject insufficient balance", async () => {
      const res = await request(app)
        .post("/withdraws/request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 1000 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('insuficiente');
    });

    it("should reject minimum amount", async () => {
      const res = await request(app)
        .post("/withdraws/request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('mínimo');
    });

    it("should get withdraw history", async () => {
      // Primero crear un retiro
      await request(app)
        .post("/withdraws/request")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 10 });

      const res = await request(app)
        .get("/withdraws/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.withdraws).toBeInstanceOf(Array);
      expect(res.body.withdraws.length).toBeGreaterThan(0);
    });
  });

  describe("Prize Distribution", () => {
    let testQuiz, testQuizRun;

    beforeAll(async () => {
      // Crear quiz de prueba
      const quizRes = await request(app)
        .post("/quiz-creation/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Prize Quiz",
          description: "Quiz for testing prizes"
        });

      testQuiz = quizRes.body;

      // Añadir reglas de premios
      await request(app)
        .post(`/quiz/${testQuiz.id}/reward-rules`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          rewardRules: [
            {
              type: "POSITION",
              fromPosition: 1,
              toPosition: 1,
              percent: 50
            },
            {
              type: "POSITION",
              fromPosition: 2,
              toPosition: 3,
              percent: 25
            }
          ]
        });

      // Crear quiz run
      const runRes = await request(app)
        .post(`/quiz/${testQuiz.id}/test-run`);

      testQuizRun = runRes.body.runId;
    });

    it("should get quiz winners when distributed", async () => {
      // Simular participantes y scores
      await prisma.quizScore.createMany({
        data: [
          { quizRunId: testQuizRun, userId: testUser.id, score: 100 },
          { quizRunId: testQuizRun, userId: 1, score: 90 } // Admin user
        ]
      });

      // Marcar quiz como terminado
      await prisma.quizRun.update({
        where: { id: testQuizRun },
        data: { 
          phase: "FINISHED",
          totalPrizeCredits: 50
        }
      });

      // Distribuir premios
      const res = await request(app)
        .post(`/prizes/distribute/${testQuizRun}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.distribution).toHaveProperty('winners');
      expect(res.body.distribution.winners.length).toBeGreaterThan(0);
    });

    it("should get prize statistics", async () => {
      const res = await request(app)
        .get("/prizes/statistics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.statistics).toHaveProperty('totalPrizes');
      expect(res.body.statistics).toHaveProperty('totalAmountDistributed');
    });
  });

  describe("Payment History", () => {
    it("should get payment history", async () => {
      const res = await request(app)
        .get("/payments/history")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.payments).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });

    it("should get legacy payment history", async () => {
      const res = await request(app)
        .get("/payments/my")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.payment.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.withdraw.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });
});
