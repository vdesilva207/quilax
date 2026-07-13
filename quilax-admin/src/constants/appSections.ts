/**
 * 8 secciones principales de la app pública (APP_SCREENS_SCHEMA.md)
 */
export const APP_SECTIONS = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'matches', title: 'Partidas', icon: 'trophy' },
  { name: 'search', title: 'Buscar', icon: 'search' },
  { name: 'quiz', title: 'Crear', icon: 'add-circle' },
  { name: 'profile', title: 'Perfil', icon: 'user' },
  { name: 'wallet', title: 'Gestión', icon: 'money' },
  { name: 'messages', title: 'Mensajes', icon: 'message' },
  { name: 'settings', title: 'Config', icon: 'gear' },
] as const;

export type AppSectionName = (typeof APP_SECTIONS)[number]['name'];
