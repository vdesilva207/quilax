# 🏗️ ARQUITECTURA FRONTEND QUIlAX - ESCALABLE PARA 205 PANTALLAS

## 🎯 **VISIÓN ARQUITECTÓNICA**

### **Objetivos**
- **Escalabilidad**: Soportar 205 pantallas sin duplicación
- **Mantenibilidad**: Código organizado y fácil de mantener
- **Rendimiento**: Optimizado para 3M+ usuarios
- **Desarrollo**: Experiencia de developer excelente
- **Testing**: Cobertura completa y fácil de testar

### **Principios**
- **Component-first**: Todo es un componente reutilizable
- **Feature-based**: Organización por funcionalidad
- **Type safety**: TypeScript estricto
- **Performance**: Lazy loading y code splitting
- **Accessibility**: WCAG 2.1 AA por defecto

---

## 📁 **ESTRUCTURA DE CARPETAS PROFESIONAL**

```
quilax-frontend/
├── public/                     # Assets estáticos
│   ├── icons/                # Favicon, app icons
│   ├── images/               # Imágenes optimizadas
│   └── manifest.json         # PWA manifest
├── src/
│   ├── components/           # Componentes UI reutilizables
│   │   ├── ui/            # Componentes base (Button, Input, etc)
│   │   │   ├── Button/
│   │   │   │   ├── index.ts
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   ├── Button.stories.tsx
│   │   │   │   └── Button.styles.ts
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Dropdown/
│   │   │   ├── Badge/
│   │   │   ├── Avatar/
│   │   │   ├── Progress/
│   │   │   ├── Table/
│   │   │   ├── Form/
│   │   │   └── index.ts       # Export centralizado
│   │   ├── layout/         # Layout components
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   ├── Container/
│   │   │   └── Navigation/
│   │   ├── features/       # Componentes específicos de features
│   │   │   ├── Quiz/
│   │   │   │   ├── QuizCard/
│   │   │   │   ├── QuestionCard/
│   │   │   │   ├── Timer/
│   │   │   │   ├── ProgressBar/
│   │   │   │   └── ResultsScreen/
│   │   │   ├── Auth/
│   │   │   ├── Profile/
│   │   │   ├── Leaderboard/
│   │   │   └── Gamification/
│   │   └── charts/         # Componentes de visualización
│   │       ├── LineChart/
│   │       ├── BarChart/
│   │       ├── PieChart/
│   │       └── ProgressChart/
│   ├── pages/               # Páginas principales (route-level)
│   │   ├── (auth)/        # Grupo de rutas auth
│   │   │   ├── login/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── login.styles.ts
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (app)/         # Grupo de rutas app
│   │   │   ├── dashboard/
│   │   │   ├── quizzes/
│   │   │   │   ├── [id]/
│   │   │   │   ├── create/
│   │   │   │   └── edit/
│   │   │   ├── profile/
│   │   │   ├── leaderboard/
│   │   │   ├── shop/
│   │   │   └── settings/
│   │   └── (admin)/       # Grupo de rutas admin
│   │       ├── dashboard/
│   │       ├── users/
│   │       ├── quizzes/
│   │       ├── analytics/
│   │       ├── financial/
│   │       └── system/
│   ├── features/            # Lógica de negocio por feature
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── quiz/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── user/
│   │   ├── admin/
│   │   └── gamification/
│   ├── hooks/              # Hooks globales reutilizables
│   │   ├── useAuth.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── useIntersectionObserver.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useResponsive.ts
│   ├── services/           # Servicios externos
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── endpoints/
│   │   │   ├── types/
│   │   │   └── middleware/
│   │   ├── auth/
│   │   ├── storage/
│   │   ├── analytics/
│   │   └── notifications/
│   ├── store/              # Estado global
│   │   ├── index.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── quizSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── adminSlice.ts
│   │   ├── middleware/
│   │   └── types/
│   ├── utils/              # Utilidades globales
│   │   ├── helpers/
│   │   ├── constants/
│   │   ├── validators/
│   │   ├── formatters/
│   │   └── calculators/
│   ├── types/              # Tipos globales
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── quiz.ts
│   │   ├── user.ts
│   │   └── admin.ts
│   ├── styles/             # Estilos globales
│   │   ├── globals.css
│   │   ├── variables.css
│   │   ├── themes/
│   │   │   ├── light.css
│   │   │   ├── dark.css
│   │   │   └── system.css
│   │   └── components/
│   ├── assets/             # Recursos estáticos
│   │   ├── icons/
│   │   ├── images/
│   │   ├── fonts/
│   │   └── sounds/
│   ├── config/             # Configuración
│   │   ├── env.ts
│   │   ├── constants.ts
│   │   └── routes.ts
│   ├── tests/              # Testing setup
│   │   ├── setup.ts
│   │   ├── mocks/
│   │   ├── utils/
│   │   └── __mocks__/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── docs/                  # Documentación
│   ├── components/
│   ├── patterns/
│   └── deployment/
├── .github/               # GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       └── test.yml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
└── README.md
```

---

## 🧩 **SISTEMA DE COMPONENTES**

### **Jerarquía de Componentes**
```
1. UI Components (Base)
   ├── Button
   ├── Input
   ├── Card
   ├── Modal
   └── ...

2. Layout Components
   ├── Header
   ├── Sidebar
   ├── Container
   └── ...

3. Feature Components
   ├── QuizCard
   ├── QuestionCard
   ├── Timer
   └── ...

4. Page Components
   ├── LoginPage
   ├── DashboardPage
   ├── QuizPage
   └── ...

5. App Components
   ├── App
   ├── Router
   └── Providers
```

### **Component Design Pattern**
```typescript
// Button/index.ts
export { default } from './Button';
export type { ButtonProps } from './Button';

// Button/Button.tsx
import React from 'react';
import { ButtonProps } from './Button.types';
import { useStyles } from './Button.styles';
import { useButton } from './Button.hook';

export const Button: React.FC<ButtonProps> = (props) => {
  const { className, children, ...rest } = props;
  const styles = useStyles(props);
  const buttonProps = useButton(props);

  return (
    <button 
      className={cn(styles.button, className)}
      {...buttonProps}
      {...rest}
    >
      {children}
    </button>
  );
};

// Button/Button.types.ts
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// Button/Button.styles.ts
import { useStyles } from '@/styles';
import type { ButtonProps } from './Button.types';

export const useStyles = (props: ButtonProps) => {
  const { variant = 'primary', size = 'md' } = props;
  
  return useStyles((theme) => ({
    button: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.md,
        fontWeight: theme.fontWeight.medium,
        transition: theme.transitions.default,
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
      },
      variants: {
        primary: {
          backgroundColor: theme.colors.primary[500],
          color: theme.colors.white,
          '&:hover': {
            backgroundColor: theme.colors.primary[600],
          },
        },
        secondary: {
          backgroundColor: theme.colors.secondary[100],
          color: theme.colors.secondary[900],
          '&:hover': {
            backgroundColor: theme.colors.secondary[200],
          },
        },
      },
      sizes: {
        sm: {
          padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
          fontSize: theme.fontSize.sm,
          height: '2rem',
        },
        md: {
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          fontSize: theme.fontSize.base,
          height: '2.5rem',
        },
        lg: {
          padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
          fontSize: theme.fontSize.lg,
          height: '3rem',
        },
      },
    },
  }));
};

// Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--secondary');
  });
});

// Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};
```

---

## 🗂️ **SISTEMA DE ROUTING**

### **File-based Routing (Next.js style)**
```typescript
// src/routes/index.ts
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: () => import('@/pages/dashboard') },
      { 
        path: 'quizzes',
        children: [
          { index: true, lazy: () => import('@/pages/quizzes') },
          { path: ':id', lazy: () => import('@/pages/quizzes/[id]') },
          { path: 'create', lazy: () => import('@/pages/quizzes/create') },
        ]
      },
      { path: 'profile', lazy: () => import('@/pages/profile') },
      { path: 'leaderboard', lazy: () => import('@/pages/leaderboard') },
    ],
  },
  {
    path: '/auth',
    children: [
      { path: 'login', lazy: () => import('@/pages/auth/login') },
      { path: 'register', lazy: () => import('@/pages/auth/register') },
      { path: 'forgot-password', lazy: () => import('@/pages/auth/forgot-password') },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAdmin>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, lazy: () => import('@/pages/admin/dashboard') },
      { path: 'users', lazy: () => import('@/pages/admin/users') },
      { path: 'quizzes', lazy: () => import('@/pages/admin/quizzes') },
      { path: 'analytics', lazy: () => import('@/pages/admin/analytics') },
      { path: 'financial', lazy: () => import('@/pages/admin/financial') },
    ],
  },
]);
```

### **Route Guards**
```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
```

---

## 🔄 **SISTEMA DE ESTADO GLOBAL**

### **Zustand Store Architecture**
```typescript
// src/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authSlice } from './slices/authSlice';
import { quizSlice } from './slices/quizSlice';
import { userSlice } from './slices/userSlice';
import { adminSlice } from './slices/adminSlice';

export const useAppStore = create<AuthStore & QuizStore & UserStore & AdminStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...authSlice(set, get),
        ...quizSlice(set, get),
        ...userSlice(set, get),
        ...adminSlice(set, get),
      }),
      {
        name: 'quilax-store',
        partialize: (state) => ({
          auth: state.auth,
          user: state.user,
        }),
      }
    )
  )
);

// src/store/slices/authSlice.ts
import { AuthState, LoginCredentials, RegisterData } from '@/types/auth';

interface AuthSlice extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const authSlice = (set: any, get: any): AuthSlice => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  refreshToken: async () => {
    try {
      const response = await authApi.refreshToken();
      set({ token: response.token });
    } catch (error) {
      get().logout();
    }
  },
});
```

---

## 🎣 **HOOKS PERSONALIZADOS**

### **Feature-specific Hooks**
```typescript
// src/features/quiz/hooks/useQuiz.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { quizApi } from '@/features/quiz/api';
import { useAppStore } from '@/store';

export const useQuiz = (id: string) => {
  const { user } = useAppStore();
  
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: () => quizApi.getQuiz(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useQuizzes = (params: QuizListParams) => {
  return useQuery({
    queryKey: ['quizzes', params],
    queryFn: () => quizApi.getQuizzes(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateQuiz = () => {
  const { quiz } = useAppStore();
  
  return useMutation({
    mutationFn: quizApi.createQuiz,
    onSuccess: (data) => {
      quiz.addQuiz(data);
    },
    onError: (error) => {
      console.error('Failed to create quiz:', error);
    },
  });
};

export const useSubmitAnswer = () => {
  const { quiz } = useAppStore();
  
  return useMutation({
    mutationFn: quizApi.submitAnswer,
    onSuccess: (data, variables) => {
      quiz.updateScore(data.score);
      quiz.nextQuestion();
    },
  });
};
```

---

## 🧪 **SISTEMA DE TESTING**

### **Testing Architecture**
```typescript
// src/tests/setup.ts
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-testid' });

// Mock API
jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock Store
jest.mock('@/store', () => ({
  useAppStore: jest.fn(),
}));

// src/components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  const defaultProps = {
    children: 'Test Button',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct text', () => {
    render(<Button {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveTextContent('Test Button');
  });

  it('calls onClick when clicked', () => {
    render(<Button {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant class', () => {
    render(<Button {...defaultProps} variant="primary" />);
    expect(screen.getByRole('button')).toHaveClass('button--primary');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button {...defaultProps} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button {...defaultProps} loading />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<Button {...defaultProps} aria-label="Test button" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Test button');
  });
});
```

---

## 🚀 **PERFORMANCE OPTIMIZATION**

### **Code Splitting Strategy**
```typescript
// Route-based splitting
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const QuizPage = lazy(() => import('@/pages/quizzes/[id]'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));

// Feature-based splitting
const QuizEditor = lazy(() => import('@/features/quiz/QuizEditor'));
const UserAnalytics = lazy(() => import('@/features/analytics/UserAnalytics'));

// Component-based splitting
const HeavyChart = lazy(() => import('@/components/charts/HeavyChart'));
```

### **Bundle Optimization**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
```

---

## 📱 **RESPONSIVE DESIGN STRATEGY**

### **Mobile-First Approach**
```typescript
// src/hooks/useResponsive.ts
import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
  };
};
```

---

## 🎯 **IMPLEMENTACIÓN PHASES**

### **Phase 1: Foundation (Days 1-3)**
1. Setup project structure
2. Configure TypeScript and ESLint
3. Setup TailwindCSS with design tokens
4. Create base UI components
5. Setup testing framework

### **Phase 2: Core Features (Days 4-7)**
1. Implement authentication system
2. Create routing system
3. Build layout components
4. Setup state management
5. Create API client

### **Phase 3: MVP Pages (Days 8-12)**
1. Build 21 core pages
2. Implement quiz functionality
3. Create admin dashboard
4. Add responsive design
5. Performance optimization

### **Phase 4: Polish & Testing (Days 13-15)**
1. Add animations and micro-interactions
2. Implement accessibility features
3. Comprehensive testing
4. Performance optimization
5. Documentation

---

## 📋 **VALIDATION CHECKLIST**

### **Architecture Validation**
- [ ] Folder structure supports 205 screens
- [ ] Component system is scalable
- [ ] State management is performant
- [ ] Routing system handles all routes
- [ ] Testing setup is comprehensive
- [ ] Performance optimization is implemented
- [ ] Accessibility is built-in
- [ ] Responsive design is mobile-first

### **Code Quality Validation**
- [ ] TypeScript is strict and type-safe
- [ ] Components are well-documented
- [ ] Tests have good coverage
- [ ] Code follows consistent patterns
- [ ] Bundle size is optimized
- [ ] Performance metrics meet targets
- [ ] Accessibility audit passes
- [ ] Cross-browser compatibility verified

---

**Nota**: Esta arquitectura está diseñada para escalar a 205 pantallas manteniendo código limpio, performante y mantenible para un equipo de desarrollo productivo.
