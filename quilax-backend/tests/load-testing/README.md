# Load Testing para Quilax

Este directorio contiene scripts de load testing para probar el backend y frontend de Quilax a gran escala.

## Requisitos

### Backend Load Testing (k6)
- [k6](https://k6.io/) - Herramienta de load testing
- Node.js y npm
- Backend de Quilax ejecutándose en `http://localhost:3001`

### Frontend Load Testing (Detox)
- [Detox](https://wix.github.io/Detox/) - Framework de testing para React Native
- iOS Simulator o Android Emulator
- App de Quilax compilada

## Scripts de Load Testing

### Backend Tests

#### 1. Quiz Load Test (`k6-quiz-load-test.js`)
Prueba la carga de endpoints relacionados con quizzes:
- Creación de quizzes
- Obtención de quizzes
- Unirse a quizzes
- Envío de respuestas

**Ejecución:**
```bash
k6 run k6-quiz-load-test.js
```

**Configuración:**
- Ramp up a 100 usuarios en 2 minutos
- Ramp up a 500 usuarios en 5 minutos
- Ramp up a 1000 usuarios en 10 minutos
- Mantener 1000 usuarios por 5 minutos
- Ramp down a 0

#### 2. Auth Load Test (`k6-auth-load-test.js`)
Prueba la carga de endpoints de autenticación:
- Registro de usuarios
- Login
- Refresh token
- Logout
- Forgot password

**Ejecución:**
```bash
k6 run k6-auth-load-test.js
```

**Configuración:**
- Ramp up a 50 usuarios en 1 minuto
- Ramp up a 200 usuarios en 3 minutos
- Ramp up a 500 usuarios en 5 minutos
- Mantener 500 usuarios por 3 minutos
- Ramp down a 0

#### 3. Messages Load Test (`k6-messages-load-test.js`)
Prueba la carga de endpoints de mensajes:
- Obtener mensajes
- Enviar mensajes
- Obtener conversaciones
- Crear tickets de soporte
- Enviar mensajes a tickets

**Ejecución:**
```bash
k6 run k6-messages-load-test.js
```

**Configuración:**
- Ramp up a 50 usuarios en 1 minuto
- Ramp up a 200 usuarios en 3 minutos
- Ramp up a 500 usuarios en 5 minutos
- Mantener 500 usuarios por 3 minutos
- Ramp down a 0

#### 4. Concurrent Users Test (`k6-concurrent-users-test.js`)
Prueba múltiples escenarios simultáneamente:
- Usuarios concurrentes en quizzes (hasta 1000)
- Usuarios concurrentes en auth (hasta 500)
- Usuarios concurrentes en mensajes (hasta 300)

**Ejecución:**
```bash
k6 run k6-concurrent-users-test.js
```

**Configuración:**
- 3 escenarios simultáneos
- Ramp up progresivo para cada escenario
- Total de hasta 1800 usuarios concurrentes

### Frontend Tests

#### 1. Detox E2E Tests
Pruebas end-to-end de la app móvil:
- Flujo completo de creación de quiz
- Flujo de login y registro
- Flujo de mensajería

**Ejecución:**
```bash
# iOS
detox test --configuration ios.sim.debug

# Android
detox test --configuration android.emu.debug
```

## Instalación

### k6
```bash
# macOS
brew install k6

# Linux
sudo gpg -k /usr/share/keyrings/k6-archive-keyring.gpg
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --import k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Detox
```bash
npm install --save-dev detox detox-circus-environment-provider
```

## Monitoreo durante Tests

### Métricas de k6
k6 proporciona métricas en tiempo real:
- `http_req_duration`: Duración de las requests HTTP
- `http_req_failed`: Tasa de fallos
- `vus`: Usuarios virtuales activos
- `iterations`: Iteraciones completadas

### Visualización
```bash
# Ejecutar con salida en formato JSON para análisis posterior
k6 run --out json=test-results.json k6-quiz-load-test.js

# Ejecutar con InfluxDB para monitoreo en tiempo real
k6 run --out influxdb=http://localhost:8086/k6 k6-quiz-load-test.js
```

## Umbrales de Rendimiento

Los scripts están configurados con los siguientes umbrales:

### Backend
- **Quiz endpoints**: 95% de requests < 500ms, 99% < 1000ms
- **Auth endpoints**: 95% de requests < 300ms, 99% < 500ms
- **Messages endpoints**: 95% de requests < 400ms, 99% < 600ms
- **Concurrent users**: 95% de requests < 500ms, 99% < 1000ms
- **Tasa de errores**: < 1-2% para todos los endpoints

## Análisis de Resultados

### Métricas Clave
1. **Throughput**: Requests por segundo
2. **Latencia**: Tiempo de respuesta (p50, p95, p99)
3. **Error Rate**: Porcentaje de requests fallidas
4. **Concurrent Users**: Número de usuarios simultáneos

### Interpretación
- Si el error rate excede el umbral, revisar logs del backend
- Si la latencia es alta, revisar queries de base de datos
- Si el throughput es bajo, revisar cuellos de botella en la infraestructura

## Troubleshooting

### Problemas Comunes

1. **Connection Refused**
   - Asegúrate de que el backend está ejecutándose
   - Verifica que el puerto 3001 esté disponible

2. **High Error Rate**
   - Revisa logs del backend
   - Verifica que la base de datos esté funcionando
   - Asegúrate de que haya suficiente memoria/CPU

3. **Slow Response Times**
   - Revisa queries de base de datos
   - Verifica que no haya cuellos de botella
   - Considera agregar más recursos al servidor

## Escalado

Para pruebas a mayor escala:

1. **Aumentar usuarios virtuales**
   - Modifica los stages en los scripts de k6
   - Asegúrate de tener suficientes recursos

2. **Distribuir carga**
   - Usa múltiples instancias de k6
   - Considera usar k6 Cloud para pruebas distribuidas

3. **Monitoreo avanzado**
   - Integra con Prometheus/Grafana
   - Configura alertas para métricas críticas
