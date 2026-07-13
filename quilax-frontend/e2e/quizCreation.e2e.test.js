describe('Quiz Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should create a quiz with 5 questions', async () => {
    // Navegar a la pantalla de crear quiz
    await element(by.id('create-quiz-button')).tap();
    
    // Esperar a que cargue la pantalla
    await waitFor(element(by.id('quiz-create-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Ingresar título del quiz
    await element(by.id('quiz-title-input')).typeText('Quiz de Prueba E2E');
    
    // Seleccionar categoría
    await element(by.id('category-button')).tap();
    await waitFor(element(by.id('category-modal')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.text('Ciencias')).tap();
    
    // Añadir 5 preguntas
    for (let i = 0; i < 5; i++) {
      await element(by.id('add-question-button')).tap();
      
      // Ingresar texto de pregunta
      await element(by.id('question-text-input')).typeText(`Pregunta de prueba ${i + 1}`);
      
      // Seleccionar tipo de pregunta
      await element(by.id('question-type-multiple-choice')).tap();
      
      // Añadir opciones
      await element(by.id('option-0-input')).typeText('Opción A');
      await element(by.id('option-1-input')).typeText('Opción B');
      await element(by.id('option-2-input')).typeText('Opción C');
      await element(by.id('option-3-input')).typeText('Opción D');
      
      // Marcar respuesta correcta
      await element(by.id('correct-option-1')).tap();
      
      // Establecer tiempos
      await element(by.id('read-duration-input')).replaceText('10');
      await element(by.id('answer-duration-input')).replaceText('30');
      
      // Establecer puntos
      await element(by.id('points-input')).replaceText('100');
    }
    
    // Navegar a siguiente
    await element(by.id('next-button')).tap();
    
    // Verificar que navega a pantalla de dificultad
    await waitFor(element(by.id('difficulty-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should select difficulty and navigate to schedule', async () => {
    // Navegar a pantalla de dificultad
    await element(by.id('difficulty-slider')).tap();
    await element(by.id('difficulty-value')).tap();
    
    // Navegar a siguiente
    await element(by.id('next-button')).tap();
    
    // Verificar que navega a pantalla de schedule
    await waitFor(element(by.id('schedule-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should select date and time and navigate to confirm', async () => {
    // Seleccionar fecha
    await element(by.id('date-picker')).tap();
    await element(by.text('15')).tap();
    await element(by.text('OK')).tap();
    
    // Seleccionar hora
    await element(by.id('time-picker')).tap();
    await element(by.text('14')).tap();
    await element(by.text('30')).tap();
    await element(by.text('OK')).tap();
    
    // Navegar a siguiente
    await element(by.id('next-button')).tap();
    
    // Verificar que navega a pantalla de confirmación
    await waitFor(element(by.id('confirm-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should confirm quiz submission', async () => {
    // Verificar que se muestran los detalles del quiz
    await expect(element(by.id('quiz-difficulty'))).toBeVisible();
    await expect(element(by.id('quiz-date'))).toBeVisible();
    await expect(element(by.id('quiz-questions-count'))).toBeVisible();
    
    // Enviar quiz
    await element(by.id('confirm-button')).tap();
    
    // Verificar alerta de confirmación
    await waitFor(element(by.text('Quiz Enviado')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Aceptar alerta
    await element(by.text('OK')).tap();
    
    // Verificar que navega a home
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should handle validation errors', async () => {
    // Intentar crear quiz sin título
    await element(by.id('create-quiz-button')).tap();
    await element(by.id('next-button')).tap();
    
    // Verificar error de validación
    await expect(element(by.text('El título es obligatorio'))).toBeVisible();
  });

  it('should add cover image', async () => {
    await element(by.id('create-quiz-button')).tap();
    
    // Añadir foto de portada
    await element(by.id('add-cover-image-button')).tap();
    await element(by.text('Galería')).tap();
    await element(by.id('image-0')).tap();
    
    // Verificar que la imagen se añadió
    await expect(element(by.id('cover-image-preview'))).toBeVisible();
  });
});
