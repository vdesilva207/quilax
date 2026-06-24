import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function addAdmin() {
  try {
    const email = 'hermesdesilvaortiz@gmail.com';
    const password = 'Admin123'; // Contraseña por defecto, cambiar después (8 caracteres + 1 mayúscula)

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Actualizar a admin principal si ya existe
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          password: hashedPassword
        }
      });
      console.log('Usuario actualizado a admin principal:', email);
    } else {
      // Crear nuevo usuario como admin principal
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          points: 0,
          balance: 0,
          currency: 'EUR'
        }
      });
      console.log('Admin principal creado:', email);
    }

    // Crear contraseña secreta de admin si no existe
    const adminAccess = await prisma.adminAccess.findFirst();
    if (!adminAccess) {
      const secretPassword = 'SoyPeruana6767.el207';
      const hashedSecret = await bcrypt.hash(secretPassword, 10);
      await prisma.adminAccess.create({
        data: {
          secretPassword: hashedSecret,
          createdBy: 1
        }
      });
      console.log('Contraseña secreta de admin creada');
    }

    console.log('Proceso completado exitosamente');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdmin();
