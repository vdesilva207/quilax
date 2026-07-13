describe('Messaging Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should navigate to messages screen', async () => {
    // Login primero
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    // Esperar a que cargue home
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Navegar a mensajes
    await element(by.id('messages-tab')).tap();
    
    // Verificar que carga la pantalla de mensajes
    await waitFor(element(by.id('messages-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should display conversations list', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    
    // Verificar que se muestra la lista de conversaciones
    await expect(element(by.id('conversations-list'))).toBeVisible();
  });

  it('should open a conversation', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    
    // Click en primera conversación
    await element(by.id('conversation-0')).tap();
    
    // Verificar que abre el chat
    await waitFor(element(by.id('chat-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should send a message', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-0')).tap();
    
    // Escribir mensaje
    await element(by.id('message-input')).typeText('Mensaje de prueba E2E');
    
    // Enviar mensaje
    await element(by.id('send-message-button')).tap();
    
    // Verificar que el mensaje aparece en el chat
    await expect(element(by.text('Mensaje de prueba E2E'))).toBeVisible();
  });

  it('should receive new messages', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-0')).tap();
    
    // Esperar a que llegue un nuevo mensaje (simulado)
    await waitFor(element(by.id('new-message-indicator')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('should mark message as read', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    await element(by.id('conversation-0')).tap();
    
    // Verificar que no hay indicador de no leído
    await expect(element(by.id('unread-indicator'))).not.toBeVisible();
  });

  it('should create support ticket', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    
    // Click en crear ticket
    await element(by.id('create-ticket-button')).tap();
    
    // Verificar que abre pantalla de crear ticket
    await waitFor(element(by.id('create-ticket-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Seleccionar categoría
    await element(by.id('category-dropdown')).tap();
    await element(by.text('Técnico')).tap();
    
    // Ingresar asunto
    await element(by.id('subject-input')).typeText('Ticket de prueba E2E');
    
    // Ingresar descripción
    await element(by.id('description-input')).typeText('Descripción del ticket de prueba');
    
    // Enviar ticket
    await element(by.id('submit-ticket-button')).tap();
    
    // Verificar mensaje de éxito
    await expect(element(by.text('Ticket creado exitosamente'))).toBeVisible();
  });

  it('should view support tickets', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    
    // Click en mis tickets
    await element(by.id('my-tickets-button')).tap();
    
    // Verificar que carga la lista de tickets
    await waitFor(element(by.id('tickets-list')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should send message to support ticket', async () => {
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('messages-tab')).tap();
    await element(by.id('my-tickets-button')).tap();
    
    // Click en primer ticket
    await element(by.id('ticket-0')).tap();
    
    // Verificar que abre el chat del ticket
    await waitFor(element(by.id('ticket-chat-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Escribir mensaje
    await element(by.id('ticket-message-input')).typeText('Mensaje adicional al ticket');
    
    // Enviar mensaje
    await element(by.id('send-ticket-message-button')).tap();
    
    // Verificar que el mensaje aparece
    await expect(element(by.text('Mensaje adicional al ticket'))).toBeVisible();
  });
});
