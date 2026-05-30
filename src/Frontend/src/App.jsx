import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';

function App() {
  const [activeSection, setActiveSection] = useState('operations');

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <main className="app-main">
        <Dashboard activeSection={activeSection} />
      </main>
    </div>
  );
}

export default App;
