import React, { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { GuestLookup } from './components/GuestLookup';
import { AppMode, Guest, Table } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.ADMIN);
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check URL parameters to determine mode
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'guest') {
      setMode(AppMode.GUEST_LOOKUP);
    }
    
    // Load state from localStorage to persist data across page reloads (simulating backend)
    const savedData = localStorage.getItem('seatsmart_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setTables(parsed.tables || []);
        setGuests(parsed.guests || []);
      } catch (e) {
        console.error("Failed to load saved data");
      }
    }
    setMounted(true);
  }, []);

  const handleDataUpdate = (newTables: Table[], newGuests: Guest[]) => {
    setTables(newTables);
    setGuests(newGuests);
    // Persist
    localStorage.setItem('seatsmart_data', JSON.stringify({ tables: newTables, guests: newGuests }));
  };

  if (!mounted) return null;

  // Construct the "public" URL for the current environment
  // In a real deployed environment, this would be the actual domain.
  // We append ?view=guest to the current URL.
  const currentUrl = window.location.href.split('?')[0];
  const publicUrl = `${currentUrl}?view=guest`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {mode === AppMode.ADMIN ? (
        <AdminDashboard 
          initialData={{ tables, guests }} 
          onDataUpdate={handleDataUpdate}
          publicUrl={publicUrl}
        />
      ) : (
        <GuestLookup 
          guests={guests} 
          tables={tables} 
        />
      )}
    </div>
  );
}

export default App;