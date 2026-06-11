import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useLocalStore } from './ui/hooks/use-local-store';

/**
 * Placeholder pages — will be implemented in later phases.
 * Each route has a minimal stub to verify routing works.
 */
function QuestionnairePage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-canvas-soft flex items-center justify-center p-xl"
    >
      <div className="bg-canvas rounded-xl p-xl max-w-lg w-full text-center">
        <h1 className="font-display text-2xl font-black text-ink mb-md">Carbon Compass</h1>
        <p className="text-body text-base leading-relaxed">
          Your carbon footprint coach. Questionnaire coming in Phase 3.
        </p>
      </div>
    </main>
  );
}

function DashboardPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-canvas-soft flex items-center justify-center p-xl"
    >
      <div className="bg-canvas rounded-xl p-xl max-w-lg w-full text-center">
        <h1 className="font-display text-2xl font-black text-ink mb-md">Dashboard</h1>
        <p className="text-body text-base leading-relaxed">
          Results will appear here after Phase 4.
        </p>
      </div>
    </main>
  );
}

/**
 * Root application component.
 * Routes to questionnaire if no profile exists, dashboard if one does.
 */
export function App() {
  const store = useLocalStore();
  const hasProfile = store.data.profile !== null;

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Routes>
        <Route
          path="/"
          element={hasProfile ? <Navigate to="/dashboard" replace /> : <QuestionnairePage />}
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Additional routes added in later phases */}
      </Routes>
    </BrowserRouter>
  );
}
