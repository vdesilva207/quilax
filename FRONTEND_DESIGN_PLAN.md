# 🎨 SISTEMA DE DISEÑO QUIlAX - DESIGN SYSTEM

## 🎯 **VISIÓN Y OBJETIVOS**

### **Visión**
Crear una experiencia de usuario excepcional para una plataforma de quizzes educativa que sea:
- **Intuitiva** y fácil de usar
- **Atractiva** visualmente
- **Accesible** para todos
- **Rápida** y responsiva
- **Escalable** para 3M+ usuarios

### **Objetivos de Diseño**
- **Consistencia visual** en todas las 205 pantallas
- **Experiencia gamificada** motivadora
- **Navegación fluida** y sin fricción
- **Diseño adaptativo** para todos los dispositivos
- **Accesibilidad WCAG 2.1 AA** completa

---

## 🎨 **PALETA DE COLORES PROFESIONAL**

### **Colores Primarios**
```css
/* Brand Colors */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* Color principal Quilax */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;
--primary-950: #172554;
```

### **Colores Secundarios**
```css
/* Neutral Colors */
--secondary-50: #f8fafc;
--secondary-100: #f1f5f9;
--secondary-200: #e2e8f0;
--secondary-300: #cbd5e1;
--secondary-400: #94a3b8;
--secondary-500: #64748b;
--secondary-600: #475569;
--secondary-700: #334155;
--secondary-800: #1e293b;
--secondary-900: #0f172a;
--secondary-950: #020617;
```

### **Colores de Semántica**
```css
/* Success Colors */
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-200: #bbf7d0;
--success-300: #86efac;
--success-400: #4ade80;
--success-500: #22c55e;  /* Correct answers, achievements */
--success-600: #16a34a;
--success-700: #15803d;
--success-800: #166534;
--success-900: #14532d;
--success-950: #052e16;

/* Warning Colors */
--warning-50: #fffbeb;
--warning-100: #fef3c7;
--warning-200: #fde68a;
--warning-300: #fcd34d;
--warning-400: #fbbf24;
--warning-500: #f59e0b;  /* Timer warnings, important info */
--warning-600: #d97706;
--warning-700: #b45309;
--warning-800: #92400e;
--warning-900: #78350f;
--warning-950: #451a03;

/* Error Colors */
--error-50: #fef2f2;
--error-100: #fee2e2;
--error-200: #fecaca;
--error-300: #fca5a5;
--error-400: #f87171;
--error-500: #ef4444;  /* Wrong answers, errors */
--error-600: #dc2626;
--error-700: #b91c1c;
--error-800: #991b1b;
--error-900: #7f1d1d;
--error-950: #450a0a;
```

### **Colores Gamificación**
```css
/* Gamification Colors */
--gold-50: #fffbeb;
--gold-100: #fef3c7;
--gold-200: #fde68a;
--gold-300: #fcd34d;
--gold-400: #fbbf24;
--gold-500: #f59e0b;  /* Gold medals, premium */

--silver-50: #f8fafc;
--silver-100: #f1f5f9;
--silver-200: #e2e8f0;
--silver-300: #cbd5e1;
--silver-400: #94a3b8;
--silver-500: #64748b;  /* Silver medals */

--bronze-50: #fef7ee;
--bronze-100: #fdecd9;
--bronze-200: #fbd9a5;
--bronze-300: #f8c26d;
--bronze-400: #f5a623;
--bronze-500: #d97706;  /* Bronze medals */
```

---

## 📝 **TIPOGRAFÍA JERÁRQUICA**

### **Familia Tipográfica Principal**
```css
/* Primary Font: Inter */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

/* Monospace Font: JetBrains Mono */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Display Font: Poppins (para headings grandes) */
--font-display: 'Poppins', 'Inter', sans-serif;
```

### **Escala Tipográfica**
```css
/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px */
--text-6xl: 3.75rem;    /* 60px */

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### **Jerarquía de Encabezados**
```css
/* Display Heading */
.text-display {
  font-family: var(--font-display);
  font-size: var(--text-6xl);
  font-weight: var(--font-bold);
  line-height: 1.1;
}

/* H1 */
.text-h1 {
  font-family: var(--font-sans);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: 1.2;
}

/* H2 */
.text-h2 {
  font-family: var(--font-sans);
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: 1.3;
}

/* H3 */
.text-h3 {
  font-family: var(--font-sans);
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: 1.4;
}

/* H4 */
.text-h4 {
  font-family: var(--font-sans);
  font-size: var(--text-xl);
  font-weight: var(--font-medium);
  line-height: 1.5;
}

/* Body */
.text-body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: 1.6;
}

/* Caption */
.text-caption {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  line-height: 1.5;
}
```

---

## 📐 **SISTEMA DE ESPACIADO**

### **Grid System (8px base)**
```css
/* Spacing Scale */
--space-0: 0px;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

### **Layout System**
```css
/* Container Max Widths */
--container-sm: 640px;   /* Mobile */
--container-md: 768px;   /* Tablet */
--container-lg: 1024px;  /* Desktop */
--container-xl: 1280px;  /* Large Desktop */
--container-2xl: 1536px; /* Extra Large */

/* Grid System */
--grid-cols-1: repeat(1, minmax(0, 1fr));
--grid-cols-2: repeat(2, minmax(0, 1fr));
--grid-cols-3: repeat(3, minmax(0, 1fr));
--grid-cols-4: repeat(4, minmax(0, 1fr));
--grid-cols-6: repeat(6, minmax(0, 1fr));
--grid-cols-12: repeat(12, minmax(0, 1fr));
```

---

## 🎭 **SISTEMA DE SOMBRAS Y EFECTOS**

### **Shadows**
```css
/* Shadow Scale */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Colored Shadows */
--shadow-primary: 0 4px 14px 0 rgb(59 130 246 / 0.15);
--shadow-success: 0 4px 14px 0 rgb(34 197 94 / 0.15);
--shadow-warning: 0 4px 14px 0 rgb(245 158 11 / 0.15);
--shadow-error: 0 4px 14px 0 rgb(239 68 68 / 0.15);
```

### **Border Radius**
```css
/* Border Radius Scale */
--radius-none: 0px;
--radius-sm: 0.125rem;   /* 2px */
--radius: 0.25rem;      /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-3xl: 1.5rem;    /* 24px */
--radius-full: 9999px;
```

---

## 🎯 **COMPONENTES CLAVE**

### **1. Button System**
- **Variants**: Primary, Secondary, Success, Warning, Error, Ghost, Outline
- **Sizes**: XS, SM, MD, LG, XL
- **States**: Default, Hover, Active, Disabled, Loading
- **Icons**: With/without icon support
- **Animations**: Smooth transitions

### **2. Card System**
- **Variants**: Default, Elevated, Bordered, Interactive
- **Sections**: Header, Content, Footer
- **Shadows**: Consistent elevation system
- **Hover effects**: Subtle lift animations

### **3. Form System**
- **Input types**: Text, Email, Password, Number, Select, Checkbox, Radio
- **Validation states**: Default, Error, Success, Warning
- **Helper text**: Consistent positioning
- **Labels**: Clear and accessible

### **4. Quiz Components**
- **Question Card**: Clear typography, good spacing
- **Answer Options**: Interactive, feedback states
- **Progress Bar**: Animated, clear indication
- **Timer**: Countdown with urgency states
- **Results Screen**: Celebratory animations

### **5. Navigation System**
- **Header**: Consistent across all pages
- **Sidebar**: Collapsible, organized sections
- **Breadcrumbs**: Clear navigation path
- **Mobile Menu**: Hamburger, slide-out drawer

---

## 🎮 **SISTEMA DE GAMIFICACIÓN**

### **Visual Feedback**
- **Success animations**: Confetti, checkmarks, stars
- **Progress indicators**: Level bars, achievement unlocks
- **Score displays**: Animated counters, streak indicators
- **Badges**: Iconographic achievements

### **Micro-interactions**
- **Button clicks**: Satisfying press feedback
- **Card hovers**: Smooth lift effects
- **Loading states**: Engaging skeleton screens
- **Transitions**: Page transitions, modal animations

---

## 📱 **RESPONSIVE DESIGN**

### **Breakpoints**
```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### **Mobile Adaptations**
- **Touch targets**: Minimum 44px
- **Thumb navigation**: Bottom-optimized menus
- **Swipe gestures**: Quiz navigation, card swipes
- **Keyboard avoidance**: Smart viewport adjustments

---

## ♿ **ACCESIBILIDAD WCAG 2.1 AA**

### **Color Contrast**
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Clear focus states

### **Keyboard Navigation**
- **Tab order**: Logical and complete
- **Focus indicators**: Visible and clear
- **Skip links**: Quick navigation to main content
- **ARIA labels**: Screen reader support

### **Screen Reader Support**
- **Semantic HTML**: Proper heading structure
- **Alternative text**: All meaningful images
- **Live regions**: Dynamic content updates
- **Form labels**: All inputs properly labeled

---

## 🚀 **PERFORMANCE OPTIMIZATION**

### **Animation Performance**
- **GPU acceleration**: Transform and opacity only
- **Reduced motion**: Respect user preferences
- **60fps animations**: Smooth and efficient
- **Loading states**: Progressive enhancement

### **Asset Optimization**
- **SVG icons**: Scalable and lightweight
- **Optimized images**: WebP format, lazy loading
- **Font loading**: Proper font-display strategy
- **Bundle splitting**: Code by route

---

## 🎯 **IMPLEMENTACIÓN PLAN**

### **Phase 1: Foundation (Days 1-2)**
1. Setup design tokens and CSS variables
2. Create base typography system
3. Implement color palette
4. Build spacing system
5. Create basic component library

### **Phase 2: Components (Days 3-5)**
1. Build all button variants
2. Create card system
3. Implement form components
4. Design navigation system
5. Add quiz-specific components

### **Phase 3: Patterns (Days 6-7)**
1. Create layout templates
2. Implement responsive design
3. Add accessibility features
4. Optimize performance
5. Test across devices

### **Phase 4: Polish (Days 8-10)**
1. Add micro-interactions
2. Implement animations
3. Optimize for performance
4. Conduct accessibility audit
5. Final testing and refinement

---

## 📋 **VALIDATION CHECKLIST**

### **Design System Validation**
- [ ] All colors meet contrast requirements
- [ ] Typography is readable at all sizes
- [ ] Spacing is consistent throughout
- [ ] Components work across all breakpoints
- [ ] Animations are smooth and performant
- [ ] Accessibility features work properly
- [ ] Loading states are engaging
- [ ] Error states are clear and helpful
- [ ] Success states are celebratory
- [ ] Navigation is intuitive

### **Technical Validation**
- [ ] CSS variables are properly scoped
- [ ] Component props are well documented
- [ ] Bundle size is optimized
- [ ] Performance metrics meet targets
- [ ] Cross-browser compatibility verified
- [ ] Mobile touch interactions work
- [ ] Keyboard navigation is complete
- [ ] Screen reader support is functional

---

**Nota**: Este design system servirá como base para todas las 205 pantallas de Quilax, garantizando consistencia, accesibilidad y una experiencia excepcional para 3M+ usuarios.
