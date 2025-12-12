import React, { useState, useEffect } from 'react';
import { Guest, Table } from '../types';
import { Search, MapPin, Armchair, AlertCircle, Loader2 } from 'lucide-react';

interface GuestLookupFromDBProps {
  planId: string;
}

export const GuestLookupFromDB: React.FC<GuestLookupFromDBProps> = ({ planId }) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Guest[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeatingPlan = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(`/api/seating?id=${planId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Seating plan not found');
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load seating plan');
        }

        const data = await response.json();
        setGuests(data.data.guests || []);
        setTables(data.data.tables || []);
      } catch (error) {
        console.error('Error fetching seating plan:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load seating plan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeatingPlan();
  }, [planId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const normalizedQuery = query.toLowerCase().trim();
    // Filter out unassigned guests for the lookup
    const results = guests.filter(g =>
      g.normalizedName.includes(normalizedQuery) && g.tableId
    );

    setMatches(results);
    setHasSearched(true);
  };

  const getTableName = (tableId?: string) => {
    return tables.find(t => t.id === tableId)?.name || 'Unknown Table';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-indigo-200">Loading seating information...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-xl p-6 flex items-center gap-3 text-red-200">
            <AlertCircle size={32} className="flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-lg">Unable to load seating plan</p>
              <p className="text-sm opacity-80">{loadError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome!</h1>
          <p className="text-indigo-200 text-sm">Find your seat for the event</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your name..."
            className="w-full bg-white/95 text-gray-900 placeholder-gray-500 rounded-full py-4 pl-6 pr-12 text-lg shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <Search size={24} />
          </button>
        </form>

        {hasSearched && (
          <div className="space-y-4 animate-fade-in-up">
            {matches.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-xl p-4 flex items-center gap-3 text-red-200">
                <AlertCircle size={24} />
                <div className="text-left">
                  <p className="font-semibold">No matches found</p>
                  <p className="text-sm opacity-80">Try searching just your first or last name.</p>
                </div>
              </div>
            ) : (
              matches.map(guest => (
                <div key={guest.id} className="bg-white rounded-xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.02]">
                  <div className="bg-indigo-600 p-4">
                    <h3 className="text-xl font-bold text-white text-center">{guest.displayName}</h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-3 bg-indigo-50 rounded-lg">
                      <MapPin size={24} className="text-indigo-600 mb-2" />
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Table</span>
                      <span className="text-lg font-bold text-indigo-900 text-center leading-tight">
                        {getTableName(guest.tableId)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg">
                      <Armchair size={24} className="text-emerald-600 mb-2" />
                      <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Seat</span>
                      <span className="text-3xl font-bold text-emerald-900">
                        {guest.seatNumber}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <p className="mt-12 text-center text-white/30 text-xs">
          Powered by Event Seat
        </p>
      </div>
    </div>
  );
};
