import React, { createContext, useContext, useMemo, useState } from 'react';

type QuizEnrollState = {
  quizId: number | null;
  runId: number | null;
  visible: boolean;
};

type QuizEnrollContextValue = QuizEnrollState & {
  openEnroll: (quizId: number, runId?: number | null) => void;
  closeEnroll: () => void;
  setRunId: (runId: number | null) => void;
};

const QuizEnrollContext = createContext<QuizEnrollContextValue | null>(null);

export function QuizEnrollProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuizEnrollState>({
    quizId: null,
    runId: null,
    visible: false,
  });

  const value = useMemo(
    () => ({
      ...state,
      openEnroll: (quizId: number, runId: number | null = null) =>
        setState({ quizId, runId, visible: true }),
      closeEnroll: () => setState({ quizId: null, runId: null, visible: false }),
      setRunId: (runId: number | null) => setState((prev) => ({ ...prev, runId })),
    }),
    [state],
  );

  return <QuizEnrollContext.Provider value={value}>{children}</QuizEnrollContext.Provider>;
}

export function useQuizEnroll() {
  const ctx = useContext(QuizEnrollContext);
  if (!ctx) throw new Error('useQuizEnroll must be used within QuizEnrollProvider');
  return ctx;
}

export default QuizEnrollContext;
