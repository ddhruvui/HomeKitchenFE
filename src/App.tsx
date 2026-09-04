import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { PlanPage } from './pages/PlanPage';
import { FridgePage } from './pages/FridgePage';
import { ListPage } from './pages/ListPage';
import { TodayPage } from './pages/TodayPage';
import { EkadashiPage } from './pages/EkadashiPage';
import { RecipesPage } from './pages/RecipesPage';
import { IngredientsPage } from './pages/IngredientsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/plan" replace />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/fridge" element={<FridgePage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/ekadashi" element={<EkadashiPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/ingredients" element={<IngredientsPage />} />
        <Route path="*" element={<Navigate to="/plan" replace />} />
      </Route>
    </Routes>
  );
}
