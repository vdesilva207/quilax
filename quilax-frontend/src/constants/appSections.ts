export const APP_TAB_SECTIONS = [
  { name: 'index', href: '/(app)', labelKey: 'tabs.home', icon: 'home', testID: 'home-tab' },
  { name: 'search', href: '/(app)/search', labelKey: 'tabs.search', icon: 'search', testID: 'search-tab' },
  { name: 'quiz', href: '/(app)/quiz/create', labelKey: 'tabs.create', icon: 'add', testID: 'create-quiz-button' },
  { name: 'profile', href: '/(app)/profile', labelKey: 'tabs.profile', icon: 'user', testID: 'profile-tab' },
  { name: 'wallet', href: '/(app)/wallet', labelKey: 'tabs.wallet', icon: 'wallet', testID: 'wallet-tab' },
  { name: 'messages', href: '/(app)/messages', labelKey: 'tabs.messages', icon: 'message', testID: 'messages-tab' },
  { name: 'settings', href: '/(app)/settings', labelKey: 'tabs.settings', icon: 'settings', testID: 'settings-tab' },
] as const;

export default APP_TAB_SECTIONS;
