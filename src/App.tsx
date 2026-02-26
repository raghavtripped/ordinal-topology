
import { AppProvider, useApp } from './context/AppContext';
import { SetupPage } from './pages/SetupPage';
import { RankingPage } from './pages/RankingPage';
import { ResultsDashboard } from './pages/ResultsDashboard';

function Router() {
  const { page } = useApp();
  if (page === 'setup') return <SetupPage />;
  if (page === 'ranking') return <RankingPage />;
  return <ResultsDashboard />;
}

function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}

export default App;
