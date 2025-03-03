import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Terms } from './pages/Terms';
import { Admin } from './pages/Admin';

function App() {
  return (
    <Routes>
      <Route path="/terms" element={<Terms />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;