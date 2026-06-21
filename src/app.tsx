import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import { useLocalStore, useRecoveryCheck } from './ui/hooks/use-local-store';
import { ToastProvider, useToast } from './ui/hooks/use-toast';
import { AppShell } from './ui/layouts/app-shell';
import { ActionsPage } from './ui/pages/actions';
import { DashboardPage } from './ui/pages/dashboard';
import { MethodologyPage } from './ui/pages/methodology';
import { OnboardingPage } from './ui/pages/onboarding';
import { ProgressPage } from './ui/pages/progress';
import { SimulatorPage } from './ui/pages/simulator';

function RootRedirect() {
  const { data } = useLocalStore();
  return data.profile ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/onboarding" replace />
  );
}

/**
 * App-level recovery check (amendment 5).
 * Runs once on mount and shows a toast if corrupt storage was recovered.
 */
function RecoveryNotifier() {
  const { wasRecovered, recoveryReason } = useRecoveryCheck();
  const { addToast } = useToast();

  useEffect(() => {
    if (wasRecovered && recoveryReason) {
      addToast(recoveryReason, 'error');
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <RecoveryNotifier />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
