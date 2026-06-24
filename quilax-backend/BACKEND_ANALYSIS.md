# 📊 ANÁLISIS: APP_SCREENS_SCHEMA.md vs BACKEND ROUTES

## 📱 APP PARA USUARIOS

### ✅ MÓDULO AUTENTICACIÓN
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Login Screen (/login) | POST /auth/login | ✅ EXISTE |
| Register Screen (/register) | POST /auth/register | ✅ EXISTE |
| Email Verification (/verify-email) | POST /auth/verify-email | ✅ EXISTE |
| ID document and face scan (/id-verification) | ❌ NO EXISTE | ❌ FALTA |
| Add Bank account (/add-bank-account) | PUT /profile/bank-account | ✅ EXISTE |
| Complete Profile (/complete-profile) | PUT /profile | ✅ EXISTE |
| Forgot Password (/forgot-password) | POST /auth/forgot-password | ✅ EXISTE |
| Reset Password (/reset-password) | POST /auth/reset-password | ✅ EXISTE |
| Change Password (/change-password) | POST /auth/change-password | ✅ EXISTE |
| Logout (/logout-confirmation) | POST /auth/logout | ✅ EXISTE |

### ✅ MÓDULO HOME
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Home Screen (/home) | GET /home | ✅ EXISTE |
| Hottest quizzes List (/quizzes) | GET /home/hottest | ✅ EXISTE |
| Newest quizzes (/newest) | GET /home | ✅ EXISTE |
| Season users highest ranking | GET /home | ✅ EXISTE |
| Recent Activity (/recent) | GET /home/recent-activity | ✅ EXISTE |
| Quick Play (/quick-play) | GET /home/quick-play | ✅ EXISTE |

### ✅ MÓDULO BUSCADOR
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Search Screen (/search) | GET /search | ✅ EXISTE |
| Search Bar (Multi-type: Quizzes, Categorías, Usuarios) | GET /search | ✅ EXISTE |
| Quiz Results | GET /search | ✅ EXISTE |
| Category Results | GET /search | ✅ EXISTE |
| User Results | GET /search | ✅ EXISTE |
| Category Buttons Grid (25-30 categorías) | GET /search/categories | ✅ EXISTE |
| Filter by Categories (/search/filter-categories) | POST /search/filter-categories | ✅ EXISTE |
| Newest Quizzes Section (/search/newest) | GET /search/newest | ✅ EXISTE |
| Hottest Quizzes Section (/search/hottest) | GET /search/hottest | ✅ EXISTE |
| Quiz Details & Join (/quiz/:id/join) | POST /quiz-run/:quizId/join | ✅ EXISTE |

### ✅ MÓDULO CREATOR
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| My Quizzes (/my-quizzes) | GET /quiz-creation/my-quizzes | ✅ EXISTE |
| Quiz Details (/quiz/:id) | GET /quiz-info/:id | ✅ EXISTE |
| Edit Quiz (/edit-quiz/:id) | PUT /quiz-creation/:id | ✅ EXISTE |
| Quiz Analytics (/quiz-analytics/:id) | GET /quiz-creation/:id/analytics | ✅ EXISTE |
| Delete Quiz (/delete-quiz/:id) | DELETE /quiz-creation/:id | ✅ EXISTE |
| Create Quiz (/create-quiz) | POST /quiz-creation | ✅ EXISTE |
| Add Questions (/add-questions) | POST /quiz-creation/:id/questions | ✅ EXISTE |
| Quiz Settings (/quiz-settings) | PUT /quiz-creation/:id/settings | ✅ EXISTE |
| Quiz Preview (/quiz-preview) | GET /quiz-creation/:id/preview | ✅ EXISTE |
| Publish Quiz (/publish-quiz) | POST /quiz-creation/:id/submit | ✅ EXISTE |

### ✅ MÓDULO PROFILE
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Profile Screen (/profile) | GET /profile | ✅ EXISTE |
| Profile Info Card (/profile-info) | GET /profile | ✅ EXISTE |
| Follow/Unfollow (/follow/:userId) | POST /social/follow/:userId | ✅ EXISTE |
| Message (/message/:userId) | POST /messages | ✅ EXISTE |
| Share Profile (/share-profile/:userId) | ❌ NO EXISTE | ❌ FALTA |
| Quiz History (/quiz-history) | ❌ NO EXISTE | ❌ FALTA |
| Quizzes Created (/quizzes-created) | GET /quiz-creation/my-quizzes | ✅ EXISTE |
| Win Rate Statistics (/win-rate) | ❌ NO EXISTE | ❌ FALTA |
| Prizes Won (/prizes-won) | GET /prizes/my-prizes | ✅ EXISTE |
| Prize History (/prize-history) | ❌ NO EXISTE | ❌ FALTA |
| Achievement Badges (/achievement-badges) | ❌ NO EXISTE | ❌ FALTA |
| Followers (/followers) | GET /social/followers/:userId | ✅ EXISTE |
| Following (/following) | GET /social/following/:userId | ✅ EXISTE |
| Friend Requests (/friend-requests) | ❌ NO EXISTE | ❌ FALTA |
| Profile Views (/profile-views) | ❌ NO EXISTE | ❌ FALTA |
| Update Name (/update-name) | PUT /profile | ✅ EXISTE |
| Update Bio (/update-bio) | PUT /profile | ✅ EXISTE |
| Update Profile Photo (/update-photo) | ❌ NO EXISTE | ❌ FALTA |
| Privacy Settings (/privacy-settings) | GET/PUT /profile/privacy | ✅ EXISTE |
| Change Password (/change-password) | POST /auth/change-password | ✅ EXISTE |

### ✅ MÓDULO GESTIONES (DINERO)
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Balance Overview (/balance) | GET /profile | ✅ EXISTE |
| Add Funds (/add-funds) | POST /payments/create-payment-intent | ✅ EXISTE |
| Payment Method (/payment-method) | ❌ NO EXISTE | ❌ FALTA |
| Confirm Payment (/confirm-payment) | POST /payments/confirm-payment | ✅ EXISTE |
| Withdraw (/withdraw) | POST /withdraws/request | ✅ EXISTE |
| Withdraw Method (/withdraw-method) | ❌ NO EXISTE | ❌ FALTA |
| Withdraw Confirmation (/withdraw-confirm) | ❌ NO EXISTE | ❌ FALTA |
| Transaction History (/transaction-history) | GET /transactions/my-history | ✅ EXISTE |
| Transaction Details (/transaction/:transactionId) | GET /transactions/:id | ✅ EXISTE |
| Filter Transactions (/filter-transactions) | ❌ NO EXISTE | ❌ FALTA |
| Export History (/export-history) | ❌ NO EXISTE | ❌ FALTA |

### ✅ MÓDULO MESSAGES
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Chat List (/chat-list) | GET /messages/conversations | ✅ EXISTE |
| Chat (/chat/:userId) | GET /messages/:userId | ✅ EXISTE |
| Chat Settings (/chat-settings/:userId) | ❌ NO EXISTE | ❌ FALTA |
| Chat Media (/chat-media/:userId) | ❌ NO EXISTE | ❌ FALTA |
| Chat Info (/chat-info/:userId) | ❌ NO EXISTE | ❌ FALTA |
| New Message (/new-message) | POST /messages | ✅ EXISTE |
| Select User (/select-user) | ❌ NO EXISTE | ❌ FALTA |
| First Message Request (/first-message-request) | ❌ NO EXISTE | ❌ FALTA |
| Accept Request (/accept-message-request/:userId) | ❌ NO EXISTE | ❌ FALTA |
| Reject Request (/reject-message-request/:userId) | ❌ NO EXISTE | ❌ FALTA |
| Block User (/block-user/:userId) | ❌ NO EXISTE | ❌ FALTA |
| Admin Messages (/admin-messages) | ❌ NO EXISTE | ❌ FALTA |
| Quiz Messages (/quiz-messages) | ❌ NO EXISTE | ❌ FALTA |

### ✅ MÓDULO SETTINGS
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Account Settings (/account-settings) | GET /profile | ✅ EXISTE |
| Personal Information (/personal-info) | PUT /profile | ✅ EXISTE |
| Security Settings (/security-settings) | ❌ NO EXISTE | ❌ FALTA |
| Bank Account Settings (/bank-account) | PUT /profile/bank-account | ✅ EXISTE |
| Verify Bank Account (/verify-bank-account) | ❌ NO EXISTE | ❌ FALTA |
| Bank Account Status (/bank-account-status) | GET /profile | ✅ EXISTE |
| Notification Settings (/notification-settings) | GET /notifications | ✅ EXISTE |
| Mark as Read (/mark-read/:notificationId) | PUT /notifications/:id/read | ✅ EXISTE |
| Notification Details (/notification/:notificationId) | GET /notifications/:id | ✅ EXISTE |
| Language Settings (/language-settings) | GET/PUT /profile/language | ✅ EXISTE |
| Help & Support (/help-support) | ✅ help.js | ✅ EXISTE |
| Centro de Ayuda (/help-center) | GET /help/search, GET /help/articles | ✅ EXISTE |
| Buscador de ayuda (/help-search) | GET /help/search | ✅ EXISTE |
| Artículos de ayuda (/help-articles) | GET /help/articles | ✅ EXISTE |
| FAQ (/faq) | GET /faq | ✅ EXISTE |
| Support Tickets (/support-tickets) | POST /support/tickets | ✅ EXISTE |
| My Tickets (/my-tickets) | GET /support/tickets/my | ✅ EXISTE |
| View Ticket Details (/ticket/:ticketId) | GET /support/tickets/:id | ✅ EXISTE |
| Send Message (/send-message) | POST /support/tickets/:ticketId/messages | ✅ EXISTE |
| Close Ticket (/close-ticket) | POST /support/tickets/:ticketId/close | ✅ EXISTE |
| Blocked Users (/blocked-users) | GET /social/blocked | ✅ EXISTE |
| Unblock User (/unblock/:userId) | DELETE /social/block/:userId | ✅ EXISTE |
| Legal (/legal) | GET /legal/terms-of-service, GET /legal/privacy-policy | ✅ EXISTE |
| Logout (/logout-confirmation) | POST /auth/logout | ✅ EXISTE |

### ✅ MÓDULO QUIZZES
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Quiz List (/quizzes) | GET /quizzes | ✅ EXISTE |
| Quiz Details (/quiz/:id) | GET /quiz-info/:id | ✅ EXISTE |
| Play Quiz (/quiz-play/:id) | POST /quiz-run/:quizId/join | ✅ EXISTE |
| Share Quiz (/share-quiz/:id) | ❌ NO EXISTE | ❌ FALTA |
| Report Quiz (/report-quiz/:id) | ❌ NO EXISTE | ❌ FALTA |
| Quiz Preview (/quiz-preview/:id) | GET /quiz-creation/:id/preview | ✅ EXISTE |
| Question Screen (/question/:questionId) | GET /quiz-play/:runId/current-question | ✅ EXISTE |
| Results Screen (/quiz-results/:id) | GET /quiz-play/:runId/results | ✅ EXISTE |
| Exit Confirmation (/exit-quiz) | ❌ NO EXISTE | ❌ FALTA |
| Share Results (/share-results) | ❌ NO EXISTE | ❌ FALTA |
| Play Again (/quiz-play/:id) | POST /quiz-run/:quizId/join | ✅ EXISTE |
| Review Answers (/review-answers/:id) | ❌ NO EXISTE | ❌ FALTA |

---

## 🛠️ PANEL ADMIN

### ✅ DASHBOARD PRINCIPAL
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Admin Dashboard (/admin) | GET /admin/dashboard | ✅ EXISTE |
| Users Management (/admin/users) | GET /admin/users | ✅ EXISTE |
| Quizzes Management (/admin/quizzes) | GET /admin/quizzes | ✅ EXISTE |
| Content Moderation (/admin/moderation) | ❌ NO EXISTE | ❌ FALTA |
| Analytics (/admin/analytics) | ❌ NO EXISTE | ❌ FALTA |
| Financial (/admin/financial) | ❌ NO EXISTE | ❌ FALTA |
| System (/admin/system) | ❌ NO EXISTE | ❌ FALTA |
| Settings (/admin/settings) | ❌ NO EXISTE | ❌ FALTA |
| Reports (/admin/reports) | ❌ NO EXISTE | ❌ FALTA |

### ✅ GESTIÓN DE USUARIOS
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| User List (/admin/users/list) | GET /admin/users | ✅ EXISTE |
| User Details (/admin/users/:userId) | GET /admin/users/:userId | ✅ EXISTE |
| Edit User (/admin/users/:userId/edit) | PUT /admin/users/:userId | ✅ EXISTE |
| Ban User (/admin/users/:userId/ban) | POST /admin/users/:userId/ban | ✅ EXISTE |
| Delete User (/admin/users/:userId/delete) | DELETE /admin/users/:userId | ✅ EXISTE |
| User Search (/admin/users/search) | GET /admin/users | ✅ EXISTE |
| User Segments (/admin/users/segments) | ❌ NO EXISTE | ❌ FALTA |
| User Analytics (/admin/users/analytics) | GET /admin/users/:userId/analytics | ✅ EXISTE |
| User Reports (/admin/users/reports) | ❌ NO EXISTE | ❌ FALTA |

### ⚠️ GESTIÓN DE QUIZZES
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Quiz List (/admin/quizzes/list) | GET /admin/quizzes | ✅ EXISTE |
| Quiz Details (/admin/quizzes/:quizId) | GET /admin/quizzes/:id | ✅ EXISTE |
| Edit Quiz (/admin/quizzes/:quizId/edit) | PUT /admin/quizzes/:id | ✅ EXISTE |
| Approve Quiz (/admin/quizzes/:quizId/approve) | POST /admin/quizzes/:id/approve | ✅ EXISTE |
| Reject Quiz (/admin/quizzes/:quizId/reject) | POST /admin/quizzes/:id/reject | ✅ EXISTE |
| Delete Quiz (/admin/quizzes/:quizId/delete) | DELETE /admin/quizzes/:id | ✅ EXISTE |
| Quiz Categories (/admin/quizzes/categories) | ❌ NO EXISTE | ❌ FALTA |
| Quiz Analytics (/admin/quizzes/analytics) | ❌ NO EXISTE | ❌ FALTA |
| Quiz Reports (/admin/quizzes/reports) | ❌ NO EXISTE | ❌ FALTA |

### ❌ GESTIÓN FINANCIERA
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| Transactions (/admin/financial/transactions) | GET /transactions | ✅ EXISTE |
| Transaction Details (/admin/financial/transactions/:transactionId) | GET /transactions/:id | ✅ EXISTE |
| Refund Transaction (/admin/financial/transactions/:transactionId/refund) | ❌ NO EXISTE | ❌ FALTA |
| Revenue Overview (/admin/financial/revenue) | ❌ NO EXISTE | ❌ FALTA |
| Daily Revenue (/admin/financial/revenue/daily) | ❌ NO EXISTE | ❌ FALTA |
| Monthly Revenue (/admin/financial/revenue/monthly) | ❌ NO EXISTE | ❌ FALTA |
| Yearly Revenue (/admin/financial/revenue/yearly) | ❌ NO EXISTE | ❌ FALTA |
| Payment Methods (/admin/financial/payment-methods) | ❌ NO EXISTE | ❌ FALTA |
| Withdrawals (/admin/financial/withdrawals) | GET /withdraws/pending | ✅ EXISTE |
| Withdrawal Details (/admin/financial/withdrawals/:withdrawalId) | ❌ NO EXISTE | ❌ FALTA |
| Approve Withdrawal (/admin/financial/withdrawals/:withdrawalId/approve) | ❌ NO EXISTE (automático) | ✅ AUTOMÁTICO |
| Reject Withdrawal (/admin/financial/withdrawals/:withdrawalId/reject) | ❌ NO EXISTE (automático) | ✅ AUTOMÁTICO |
| Refunds (/admin/financial/refunds) | ❌ NO EXISTE | ❌ FALTA |

### ❌ GESTIÓN DEL SISTEMA
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| System Status (/admin/system/status) | ❌ NO EXISTE | ❌ FALTA |
| Server Management (/admin/system/servers) | ❌ NO EXISTE | ❌ FALTA |
| Database Management (/admin/system/database) | ❌ NO EXISTE | ❌ FALTA |
| Cache Management (/admin/system/cache) | ❌ NO EXISTE | ❌ FALTA |
| Logs (/admin/system/logs) | ❌ NO EXISTE | ❌ FALTA |
| Maintenance (/admin/system/maintenance) | ❌ NO EXISTE | ❌ FALTA |

### ❌ CONFIGURACIÓN ADMIN
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| General Settings (/admin/settings/general) | ❌ NO EXISTE | ❌ FALTA |
| User Settings (/admin/settings/users) | ❌ NO EXISTE | ❌ FALTA |
| Quiz Settings (/admin/settings/quizzes) | ❌ NO EXISTE | ❌ FALTA |
| Payment Settings (/admin/settings/payments) | ❌ NO EXISTE | ❌ FALTA |
| Email Settings (/admin/settings/emails) | ❌ NO EXISTE | ❌ FALTA |
| Security Settings (/admin/settings/security) | ❌ NO EXISTE | ❌ FALTA |
| API Settings (/admin/settings/api) | ❌ NO EXISTE | ❌ FALTA |
| Integration Settings (/admin/settings/integrations) | ❌ NO EXISTE | ❌ FALTA |
| Theme Settings (/admin/settings/theme) | ❌ NO EXISTE | ❌ FALTA |
| Language Settings (/admin/settings/languages) | ❌ NO EXISTE | ❌ FALTA |
| Backup Settings (/admin/settings/backup) | ❌ NO EXISTE | ❌ FALTA |

### ❌ REPORTES Y EXPORTACIÓN
| Pantalla Frontend | Ruta Backend | Estado |
|-------------------|--------------|--------|
| User Reports (/admin/reports/users) | ❌ NO EXISTE | ❌ FALTA |
| Quiz Reports (/admin/reports/quizzes) | ❌ NO EXISTE | ❌ FALTA |
| Financial Reports (/admin/reports/financial) | ❌ NO EXISTE | ❌ FALTA |
| System Reports (/admin/reports/system) | ❌ NO EXISTE | ❌ FALTA |
| Custom Reports (/admin/reports/custom) | ❌ NO EXISTE | ❌ FALTA |

---

## 📊 RESUMEN

### ✅ RUTAS IMPLEMENTADAS (Backend está preparado)
- Autenticación completa (login, register, email verification, forgot password, reset password, change password, logout)
- Home screen (quizzes destacados, newest, season ranking, actividad reciente, quick play)
- Search (búsqueda multi-tipo: quizzes, categorías, usuarios, filtros)
- Categories (gestión de categorías)
- Follow/Unfollow users
- Profile views (seguidores, siguiendo, blocked users)
- Quiz analytics (para creadores con regla de 7 días y 10 quizzes)
- Admin dashboard (métricas principales)
- Admin users management (list, details, edit, ban, delete, analytics)
- Quizzes (crear, editar, aprobar, rechazar, jugar, ver resultados)
- Profile (ver, editar, privacy settings, language settings)
- Gestiones (balance, añadir fondos, retirar, historial)
- Messages (conversaciones, enviar mensajes)
- Notifications (ver, marcar como leído)
- Help Center (buscar, artículos, tickets)
- Support Tickets (crear, ver, responder, cerrar)
- Transactions (ver historial, ver detalles)
- Withdrawals (solicitar, ver pendientes)
- Seasons (ver ranking)
- Rankings (ver ranking)
- FAQ (preguntas frecuentes)
- Legal pages (terms of service, privacy policy)

### ❌ RUTAS FALTANTES (Backend NO está preparado)

**IMPORTANTES:**
1. ID verification (documento y face scan)
2. Quiz sharing
3. Quiz reporting
4. Profile photo upload
5. Security settings (completo)
6. Chat settings
7. Friend requests
8. Quiz review (ver respuestas después de jugar)
9. Admin financial analytics
10. Admin system management
11. Admin settings
12. Admin reports

**SECUNDARIAS:**
1. Profile sharing
2. Achievement badges
3. Win rate statistics
4. Prize history
5. Transaction filtering
6. Transaction export
7. Admin categories management
8. Admin quiz analytics
9. Admin quiz reports
10. Admin refunds
11. Admin revenue analytics
12. Admin system status
13. Admin database management
14. Admin cache management
15. Admin logs
16. Admin maintenance

---

## 🎯 PRIORIDADES DE IMPLEMENTACIÓN

### FASE 1 - MÍNIMO VIABLE (MVP)
1. Email verification
2. Forgot password / Reset password
3. Home screen
4. Search básico (quizzes)
5. Categories básicas
6. Follow/Unfollow users
7. Profile views (seguidores, siguiendo)
8. Quiz analytics básico
9. Admin dashboard básico
10. Admin users management básico

### FASE 2 - FUNCIONALIDAD COMPLETA
1. ID verification
2. Quiz sharing
3. Quiz reporting
4. Profile photo upload
5. Privacy settings
6. Security settings
7. Language settings
8. FAQ
9. Blocked users
10. Legal pages

### FASE 3 - CARACTERÍSTICAS AVANZADAS
1. Admin analytics completas
2. Admin financial analytics
3. Admin system management
4. Admin settings
5. Admin reports
6. Transaction filtering
7. Transaction export
