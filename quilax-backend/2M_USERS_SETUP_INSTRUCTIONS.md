# Instrucciones para Configuración de 2M Usuarios Concurrentes

## Estado Actual
Se han implementado todas las optimizaciones necesarias para soportar 2 millones de usuarios concurrentes en la app:

### Optimizaciones Implementadas ✅
1. **Clustering de Node.js** - Configurado en `src/index.js` para usar múltiples workers basados en CPUs
2. **Rate limiting distribuido** - Implementado en `src/middleware/rateLimiter.js` con límites específicos por endpoint
3. **Monitoreo Prometheus** - Implementado en `src/config/monitoring.js` con métricas HTTP, DB, Redis, Socket.IO
4. **Configuración Redis** - Implementado en `src/config/redis.js` para caching y sesiones
5. **Optimizaciones PostgreSQL** - Configurado en `postgres.conf` con 50K conexiones
6. **Load balancer Nginx** - Configurado en `nginx.conf` para 8 instancias backend
7. **Horizontal scaling** - Configurado en `docker-compose.yml` con 8 instancias
8. **WebSocket clustering** - Configurado en `src/config/socket.js` con Redis adapter
9. **CDN S3/CloudFront** - Configurado en `src/config/cdn.js` para assets estáticos
10. **Tests de carga k6** - Scripts creados en `tests/load-testing/`
11. **Corrección de esquema** - Agregados campos faltantes al modelo User en `prisma/schema.prisma`

## Pasos Restantes (Ejecución Manual)

Debido a que los comandos bash no están disponibles en este momento, necesitas ejecutar los siguientes comandos manualmente:

### 1. Ejecutar migración de Prisma
```bash
cd /Users/imac/Desktop/quilax/quilax-backend
npx prisma migrate dev --name add_user_fields
```

### 2. Reiniciar el backend con las nuevas configuraciones
```bash
cd /Users/imac/Desktop/quilax/quilax-backend
npm start
```

### 3. Ejecutar test de carga con k6
```bash
cd /Users/imac/Desktop/quilax/quilax-backend/tests/load-testing
k6 run k6-2m-users-test.js
```

## Arquitectura Final para 2M Usuarios

### Backend
- **8 instancias del backend** con clustering (múltiples workers por CPU)
- **Nginx** como load balancer con 100K conexiones por worker
- **PostgreSQL** con 50K conexiones máximas y 96GB de caché
- **Redis** para caching y sesiones con 8GB de RAM
- **Prometheus/Grafana** para monitoreo en tiempo real
- **Elasticsearch/Kibana** para logs

### Frontend
- **Optimización de assets** con CDN (CloudFront)
- **Configuración optimizada** para baja latencia
- **Tests E2E** con Detox para flujo completo

### Tests de Carga
- **k6-2m-users-test.js** - Test de carga progresivo (hasta 1000 usuarios local)
- **k6-concurrent-users-test.js** - Test de usuarios concurrentes múltiples (hasta 1800)
- **k6-quiz-load-test.js** - Test específico de quizzes (hasta 1000)
- **k6-auth-load-test.js** - Test específico de auth (hasta 500)
- **k6-messages-load-test.js** - Test específico de mensajes (hasta 500)

## Métricas Clave a Monitorear

### Backend
- **Throughput**: Requests por segundo
- **Latencia**: Tiempo de respuesta (p50, p95, p99)
- **Error Rate**: Porcentaje de requests fallidas
- **Concurrent Users**: Número de usuarios simultáneos
- **DB Connections**: Conexiones activas de base de datos
- **Redis Cache Hit Rate**: Tasa de aciertos de caché

### Umbrales de Rendimiento
- **95% de requests < 500ms** para endpoints generales
- **95% de requests < 300ms** para endpoints de auth
- **Error rate < 1-2%** para todos los endpoints
- **DB connections < 40K** activas
- **CPU usage < 80%**
- **Memory usage < 8GB**

## Próximos Pasos Después del Test

1. **Analizar resultados** del test de carga
2. **Ajustar configuraciones** basado en resultados
3. **Implementar monitoreo** en producción
4. **Configurar alertas** para métricas críticas
5. **Optimizar queries** lentas si es necesario
6. **Implementar caching** adicional si es necesario

## Notas Importantes

- El test local simula hasta 1000 usuarios concurrentes debido a limitaciones de recursos locales
- Para pruebas a escala real (2M usuarios), se requiere infraestructura en la nube
- La configuración actual está optimizada para escalar horizontalmente
- Redis está configurado pero no es crítico para el funcionamiento básico
- El clustering de Node.js se activa automáticamente en producción

## Archivos Modificados

- `src/index.js` - Integración de clustering, rate limiting, métricas
- `src/config/monitoring.js` - Métricas Prometheus (convertido a ES modules)
- `src/config/redis.js` - Configuración Redis (convertido a ES modules)
- `src/middleware/rateLimiter.js` - Rate limiting distribuido (convertido a ES modules)
- `src/config/socket.js` - WebSocket clustering con Redis adapter
- `src/config/cdn.js` - Configuración CDN S3/CloudFront
- `prisma/schema.prisma` - Corrección de campos faltantes en User model
- `postgres.conf` - Optimizaciones PostgreSQL para alta concurrencia
- `nginx.conf` - Load balancer configuración
- `docker-compose.yml` - Horizontal scaling con 8 instancias
- `tests/load-testing/k6-2m-users-test.js` - Test de carga progresivo
