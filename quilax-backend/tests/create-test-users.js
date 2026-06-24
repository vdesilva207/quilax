import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";

const createTestUsers = async () => {
  console.log("🔧 Creating test users...");
  
  const testUsers = [];
  
  for (let i = 1; i <= 10000; i++) {
    const email = `testuser${i}@test.com`;
    const password = "testpassword123";
    const hashedPassword = await bcrypt.hash(password, 10);
    
    testUsers.push({
      email,
      password: hashedPassword,
      role: "USER",
      points: 1000,
      balance: 5000
    });
  }
  
  // Crear admin
  const adminPassword = await bcrypt.hash("adminpassword123", 10);
  testUsers.push({
    email: "admin@test.com",
    password: adminPassword,
    role: "ADMIN",
    points: 10000,
    balance: 50000
  });
  
  try {
    // Insertar en batches
    const batchSize = 100;
    for (let i = 0; i < testUsers.length; i += batchSize) {
      const batch = testUsers.slice(i, i + batchSize);
      await prisma.user.createMany({
        data: batch,
        skipDuplicates: true
      });
      console.log(`✅ Created batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(testUsers.length/batchSize)}`);
    }
    
    console.log("✅ Test users created successfully!");
    console.log(`📊 Total users: ${testUsers.length}`);
    
  } catch (error) {
    console.error("❌ Error creating test users:", error);
  }
  
  await prisma.$disconnect();
};

createTestUsers();
