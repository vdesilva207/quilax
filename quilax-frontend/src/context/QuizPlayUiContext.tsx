import React, { createContext, useContext, useMemo, useState } from 'react';

type QuizPlayUiValue = {
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
};

const QuizPlayUiContext = createContext<QuizPlayUiValue | null>(null);

export function QuizPlayUiProvider({ children }: { children: React.ReactNode }) {
  const [hideTabBar, setHideTabBar] = useState(false);
  const value = useMemo(() => ({ hideTabBar, setHideTabBar }), [hideTabBar]);
  return <QuizPlayUiContext.Provider value={value}>{children}</QuizPlayUiContext.Provider>;
}

export function useQuizPlayUi() {
  const ctx = useContext(QuizPlayUiContext);
  if (!ctx) {
    return { hideTabBar: false, setHideTabBar: () => {} };
  }
  return ctx;
}

export default QuizPlayUiContext;
