export const APP_TAB_SECTIONS = [
  { name: 'index', href: '/(app)', label: 'Home', icon: 'home', testID: 'home-tab' },
  { name: 'search', href: '/(app)/search', label: 'Buscar', icon: 'search', testID: 'search-tab' },
  { name: 'quiz', href: '/(app)/quiz/create', label: 'Crear', icon: 'add', testID: 'create-quiz-button' },
  { name: 'messages', href: '/(app)/messages', label: 'Mensajes', icon: 'message', testID: 'messages-tab' },
  { name: 'profile', href: '/(app)/profile', label: 'Perfil', icon: 'user', testID: 'profile-tab' },
  { name: 'settings', href: '/(app)/settings', label: 'Ajustes', icon: 'settings', testID: 'settings-tab' },
] as const;

export default APP_TAB_SECTIONS;
