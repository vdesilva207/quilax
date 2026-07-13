describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should register a new user', async () => {
    // Navegar a pantalla de registro
    await element(by.id('register-button')).tap();
    
    // Esperar a que cargue la pantalla
    await waitFor(element(by.id('register-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Ingresar email
    const randomEmail = `e2e${Date.now()}@test.com`;
    await element(by.id('email-input')).typeText(randomEmail);
    
    // Ingresar contraseña
    await element(by.id('password-input')).typeText('TestPassword123!');
    
    // Confirmar contraseña
    await element(by.id('confirm-password-input')).typeText('TestPassword123!');
    
    // Aceptar términos
    await element(by.id('terms-checkbox')).tap();
    
    // Registrarse
    await element(by.id('submit-register-button')).tap();
    
    // Verificar que navega a verificación de email
    await waitFor(element(by.id('email-verification-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should login with existing user', async () => {
    // Navegar a pantalla de login
    await element(by.id('login-button')).tap();
    
    // Esperar a que cargue la pantalla
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Ingresar email
    await element(by.id('email-input')).typeText('testuser@example.com');
    
    // Ingresar contraseña
    await element(by.id('password-input')).typeText('TestPassword123!');
    
    // Login
    await element(by.id('login-submit-button')).tap();
    
    // Verificar que navega a home
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('login-button')).tap();
    
    // Ingresar credenciales inválidas
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('WrongPassword');
    
    // Intentar login
    await element(by.id('login-submit-button')).tap();
    
    // Verificar error
    await expect(element(by.text('Credenciales inválidas'))).toBeVisible();
  });

  it('should handle forgot password flow', async () => {
    await element(by.id('login-button')).tap();
    
    // Click en forgot password
    await element(by.id('forgot-password-button')).tap();
    
    // Verificar que navega a pantalla de forgot password
    await waitFor(element(by.id('forgot-password-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Ingresar email
    await element(by.id('email-input')).typeText('testuser@example.com');
    
    // Enviar
    await element(by.id('submit-forgot-password-button')).tap();
    
    // Verificar mensaje de éxito
    await expect(element(by.text('Email enviado'))).toBeVisible();
  });

  it('should validate email format', async () => {
    await element(by.id('register-button')).tap();
    
    // Ingresar email inválido
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('confirm-password-input')).typeText('TestPassword123!');
    await element(by.id('terms-checkbox')).tap();
    
    // Intentar registrarse
    await element(by.id('submit-register-button')).tap();
    
    // Verificar error de validación
    await expect(element(by.text('Email inválido'))).toBeVisible();
  });

  it('should validate password strength', async () => {
    await element(by.id('register-button')).tap();
    
    // Ingresar contraseña débil
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('weak');
    await element(by.id('confirm-password-input')).typeText('weak');
    await element(by.id('terms-checkbox')).tap();
    
    // Intentar registrarse
    await element(by.id('submit-register-button')).tap();
    
    // Verificar error de validación
    await expect(element(by.text('La contraseña debe tener al menos 8 caracteres'))).toBeVisible();
  });

  it('should require password confirmation match', async () => {
    await element(by.id('register-button')).tap();
    
    // Ingresar contraseñas diferentes
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('Password123!');
    await element(by.id('confirm-password-input')).typeText('DifferentPassword123!');
    await element(by.id('terms-checkbox')).tap();
    
    // Intentar registrarse
    await element(by.id('submit-register-button')).tap();
    
    // Verificar error de validación
    await expect(element(by.text('Las contraseñas no coinciden'))).toBeVisible();
  });

  it('should logout successfully', async () => {
    // Login primero
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    // Esperar a que cargue home
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Navegar a perfil
    await element(by.id('profile-tab')).tap();
    
    // Logout
    await element(by.id('logout-button')).tap();
    
    // Confirmar logout
    await element(by.id('confirm-logout-button')).tap();
    
    // Verificar que navega a login
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
