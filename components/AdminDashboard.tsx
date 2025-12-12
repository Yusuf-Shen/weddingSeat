import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Users, Layers, Share2, RotateCcw, LayoutGrid, CheckSquare, Square, Plus, Save, Loader2 } from 'lucide-react';
import { Table, Guest, AssignmentResult } from '../types';
import { processGuestList, assignGuestsToTable } from '../utils/core';
import { TableCard } from './TableCard';
import { DEFAULT_TABLE_COUNT, DEFAULT_CAPACITY, MAX_CAPACITY } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface AdminDashboardProps {
  initialData?: { tables: Table[]; guests: Guest[] };
  onDataUpdate: (tables: Table[], guests: Guest[]) => void;
  publicUrl: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialData, onDataUpdate, publicUrl }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tableCount, setTableCount] = useState(DEFAULT_TABLE_COUNT);
  const [tableCapacity, setTableCapacity] = useState(DEFAULT_CAPACITY);
  const [tables, setTables] = useState<Table[]>(initialData?.tables || []);
  const [rawGuestList, setRawGuestList] = useState('');
  const [guests, setGuests] = useState<Guest[]>(initialData?.guests || []);
  const [unassignedCount, setUnassignedCount] = useState(0);
  
  // Selection state
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  
  // Add guest state
  const [newGuestInput, setNewGuestInput] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);

  // Save to database state
  const [isSaving, setIsSaving] = useState(false);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize tables if empty
  useEffect(() => {
    if (tables.length === 0) {
      regenerateTables(DEFAULT_TABLE_COUNT, DEFAULT_CAPACITY);
    }
  }, []);

  // Update unassigned count when guests change
  useEffect(() => {
    const unassigned = guests.filter(g => !g.tableId).length;
    setUnassignedCount(unassigned);
  }, [guests]);

  const regenerateTables = (count: number, capacity: number) => {
    const newTables: Table[] = Array.from({ length: count }, (_, i) => ({
      id: `table-${i + 1}`,
      name: `Table ${i + 1}`,
      capacity: capacity,
      guests: []
    }));
    setTables(newTables);
    // If we have guests, we should re-assign them to these new tables immediately? 
    // For now, let's clear assignments when regenerating structure.
    const resetGuests = guests.map(g => ({...g, tableId: undefined, seatNumber: undefined}));
    setGuests(resetGuests);
  };

  const handleTableCountChange = (count: number) => {
    setTableCount(count);
    regenerateTables(count, tableCapacity);
  };

  const handleCapacityChange = (capacity: number) => {
    setTableCapacity(capacity);
    regenerateTables(tableCount, capacity);
  };

  const handleProcessGuests = () => {
    const processed = processGuestList(rawGuestList);
    setGuests(processed);
    // Don't auto assign - let user manually assign
    setUnassignedCount(processed.length);
    onDataUpdate(tables, processed);
    setStep(2);
  };

  const handleToggleGuestSelection = (guestId: string) => {
    const newSelection = new Set(selectedGuestIds);
    if (newSelection.has(guestId)) {
      newSelection.delete(guestId);
    } else {
      newSelection.add(guestId);
    }
    setSelectedGuestIds(newSelection);
  };

  const handleSelectAll = () => {
    const unassignedGuests = guests.filter(g => !g.tableId);
    if (selectedGuestIds.size === unassignedGuests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(unassignedGuests.map(g => g.id)));
    }
  };

  const handleAssignToTable = () => {
    if (!selectedTableId || selectedGuestIds.size === 0) return;

    const { updatedTables, updatedGuests } = assignGuestsToTable(
      Array.from(selectedGuestIds),
      selectedTableId,
      guests,
      tables
    );

    setTables(updatedTables);
    setGuests(updatedGuests);
    setSelectedGuestIds(new Set());
    setSelectedTableId('');
    
    const unassigned = updatedGuests.filter(g => !g.tableId).length;
    setUnassignedCount(unassigned);
    onDataUpdate(updatedTables, updatedGuests);
  };

  const handleRenameTable = (id: string, newName: string) => {
    const updated = tables.map(t => t.id === id ? { ...t, name: newName } : t);
    setTables(updated);
    onDataUpdate(updated, guests);
  };

  const handleAddGuests = () => {
    if (!newGuestInput.trim()) return;
    
    const newGuests = processGuestList(newGuestInput);
    if (newGuests.length > 0) {
      // Check for duplicates by comparing normalized names
      const existingNormalizedNames = new Set(guests.map(g => g.normalizedName));
      const duplicateGuests: string[] = [];
      const uniqueNewGuests: typeof newGuests = [];
      
      newGuests.forEach(guest => {
        if (existingNormalizedNames.has(guest.normalizedName)) {
          duplicateGuests.push(guest.displayName);
        } else {
          uniqueNewGuests.push(guest);
        }
      });
      
      // Show dialog if there are duplicates
      if (duplicateGuests.length > 0) {
        const duplicateList = duplicateGuests.join(', ');
        const message = `以下宾客名字已存在，将被跳过：\n\n${duplicateList}\n\n是否继续添加其他宾客？`;
        if (!window.confirm(message)) {
          return; // User cancelled
        }
      }
      
      // Add unique guests if any
      if (uniqueNewGuests.length > 0) {
        const updatedGuests = [...guests, ...uniqueNewGuests].sort((a, b) => 
          a.displayName.localeCompare(b.displayName)
        );
        setGuests(updatedGuests);
        setUnassignedCount(updatedGuests.filter(g => !g.tableId).length);
        onDataUpdate(tables, updatedGuests);
        setNewGuestInput('');
        setShowAddGuest(false);
        
        // Show success message
        if (duplicateGuests.length > 0) {
          alert(`成功添加 ${uniqueNewGuests.length} 位宾客（已跳过 ${duplicateGuests.length} 位重复的宾客）`);
        }
      } else {
        // All guests were duplicates
        alert('所有输入的宾客名字都已存在，没有新宾客被添加。');
        setNewGuestInput('');
      }
    }
  };

  // Save seating plan to database
  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const planId = savedPlanId || uuidv4();

      const response = await fetch('/api/seating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: planId,
          tables,
          guests,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save seating plan');
      }

      const data = await response.json();
      setSavedPlanId(data.id);
      setStep(3);
    } catch (error) {
      console.error('Error saving to database:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save seating plan');
    } finally {
      setIsSaving(false);
    }
  };

  // UI Components for steps
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Layers className="text-indigo-600" />
            Table Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Tables: <span className="text-indigo-600 font-bold">{tableCount}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={tableCount} 
                onChange={(e) => handleTableCountChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>20</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seats per Table: <span className="text-indigo-600 font-bold">{tableCapacity}</span>
              </label>
              <input 
                type="range" 
                min="4" 
                max="12" 
                value={tableCapacity} 
                onChange={(e) => handleCapacityChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>4</span>
                <span>12</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Table Names</label>
              <p className="text-xs text-gray-500 mb-3">
                Default names: Table 1, Table 2, etc. You can rename tables by clicking on their names in the assignment view.
              </p>
            </div>
          </div>
        </div>

        {/* Guest Import Panel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="text-emerald-600" />
            Guest List
          </h2>
          <textarea
            value={rawGuestList}
            onChange={(e) => setRawGuestList(e.target.value)}
            placeholder="Paste your guest list here (one per line)...&#10;Alice Smith&#10;Bob Jones&#10;Charlie Brown"
            className="flex-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
            style={{ minHeight: '200px' }}
          />
          <div className="mt-4 flex justify-between items-center">
             <span className="text-xs text-gray-500">
               {rawGuestList ? `${rawGuestList.split('\n').filter(l => l.trim()).length} guests detected` : 'No guests yet'}
             </span>
             <button
               onClick={handleProcessGuests}
               disabled={!rawGuestList.trim()}
               className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
             >
               Import Guests
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const unassignedGuests = guests.filter(g => !g.tableId);
    const assignedGuests = guests.filter(g => g.tableId);
    
    return (
      <div className="flex flex-col gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-shrink-0">
          <div>
             <h2 className="text-lg font-bold text-gray-800">Seating Assignments</h2>
             <p className="text-sm text-gray-500">
               {guests.length} guests • {unassignedCount > 0 ? <span className="text-red-500 font-bold">{unassignedCount} Unassigned</span> : <span className="text-emerald-500 font-bold">All Seated</span>}
             </p>
          </div>
          <div className="flex gap-2">
             <button
               onClick={() => setStep(1)}
               className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2"
             >
               <RotateCcw size={16} /> Reset
             </button>
             <button
               onClick={handleSaveToDatabase}
               disabled={isSaving || guests.filter(g => g.tableId).length === 0}
               className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
             >
               {isSaving ? (
                 <>
                   <Loader2 size={16} className="animate-spin" /> Saving...
                 </>
               ) : (
                 <>
                   <Save size={16} /> Save & Share
                 </>
               )}
             </button>
          </div>
          {saveError && (
            <p className="text-red-500 text-sm mt-2">{saveError}</p>
          )}
        </div>

        <div className="flex gap-6" style={{ minHeight: 0 }}>
          {/* Main Content Area */}
          <div className={`flex flex-col gap-6 transition-all duration-300 ${selectedGuestIds.size > 0 ? 'flex-1' : 'w-full'}`} style={{ minHeight: 0 }}>
            {/* Guest List Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col" style={{ height: '550px', width: '600px', flexShrink: 0 }}>
              <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Users className="text-indigo-600" size={20} />
                  Guest List
                </h3>
                <div className="flex items-center gap-2">
                  {unassignedGuests.length > 0 && (
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {selectedGuestIds.size === unassignedGuests.length ? 'Deselect All' : 'Select All Unassigned'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddGuest(!showAddGuest)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                  >
                    <Plus size={16} />
                    Add Guests
                  </button>
                </div>
              </div>
              {showAddGuest && (
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="space-y-2">
                    <textarea
                      value={newGuestInput}
                      onChange={(e) => setNewGuestInput(e.target.value)}
                      placeholder="Enter guest names (one per line or separated by commas)...&#10;John Doe&#10;Jane Smith"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                      style={{ minHeight: '80px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleAddGuests();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {newGuestInput ? `${newGuestInput.split(/\n|,/).filter(l => l.trim()).length} guest(s) detected` : 'Enter names separated by new lines or commas'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowAddGuest(false);
                            setNewGuestInput('');
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddGuests}
                          disabled={!newGuestInput.trim()}
                          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4">
                {unassignedGuests.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    {guests.length === 0 ? 'No guests imported yet' : 'All guests have been assigned'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {unassignedGuests.map(guest => {
                      const isSelected = selectedGuestIds.has(guest.id);
                      
                      return (
                        <div
                          key={guest.id}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleGuestSelection(guest.id)}
                            className="flex-shrink-0 text-indigo-600 hover:text-indigo-700"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="fill-current" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">{guest.displayName}</div>
                            <div className="text-[10px] text-red-500">Unassigned</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tables Grid - Fixed Height and Width */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0" style={{ height: '400px', width: '100%' }}>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <LayoutGrid className="text-indigo-600" size={20} />
                Tables Overview
              </h3>
              <div className="h-[calc(100%-3rem)] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tables.map(table => (
                    <TableCard 
                      key={table.id}
                      table={table}
                      assignedGuests={guests.filter(g => g.tableId === table.id).sort((a,b) => (a.seatNumber || 0) - (b.seatNumber || 0))}
                      onRename={handleRenameTable}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar for Assignment - Only show when guests are selected */}
          {selectedGuestIds.size > 0 && (
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-shrink-0 flex flex-col transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Assign to Table</h3>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Table
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border"
                  >
                    <option value="">Choose a table...</option>
                    {tables.map(table => {
                      const assignedCount = guests.filter(g => g.tableId === table.id).length;
                      const available = table.capacity - assignedCount;
                      return (
                        <option key={table.id} value={table.id}>
                          {table.name} ({assignedCount}/{table.capacity} - {available} available)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-indigo-900 mb-1">
                    Selected Guests
                  </div>
                  <div className="text-2xl font-bold text-indigo-600 mb-2">
                    {selectedGuestIds.size}
                  </div>
                  {selectedGuestIds.size > 0 && (
                    <>
                      <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                        {Array.from(selectedGuestIds).map(guestId => {
                          const guest = guests.find(g => g.id === guestId);
                          return guest ? (
                            <div key={guestId} className="text-xs text-indigo-700 bg-white px-2 py-1 rounded">
                              {guest.displayName}
                            </div>
                          ) : null;
                        })}
                      </div>
                      {selectedTableId && (
                        <div className="text-xs text-indigo-700 border-t border-indigo-300 pt-2">
                          {(() => {
                            const table = tables.find(t => t.id === selectedTableId);
                            if (!table) return null;
                            const assignedCount = guests.filter(g => g.tableId === table.id).length;
                            const available = table.capacity - assignedCount;
                            const canFit = available >= selectedGuestIds.size;
                            return canFit ? (
                              <span className="text-emerald-600">✓ Can fit all selected guests</span>
                            ) : (
                              <span className="text-red-600">⚠ Only {available} seats available</span>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button
                  onClick={handleAssignToTable}
                  disabled={!selectedTableId || selectedGuestIds.size === 0}
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Users size={18} />
                  Confirm Assignment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    // Build the guest lookup URL with plan ID
    const baseUrl = window.location.href.split('?')[0];
    const guestLookupUrl = savedPlanId ? `${baseUrl}?plan=${savedPlanId}` : publicUrl;

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)]">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Ready!</h2>
          <p className="text-gray-500 mb-2">Scan to find your seat</p>
          {savedPlanId && (
            <p className="text-emerald-600 text-sm mb-6 flex items-center justify-center gap-1">
              <Save size={14} /> Saved to database
            </p>
          )}

          <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 inline-block mb-8">
             <QRCodeCanvas
               value={guestLookupUrl}
               size={250}
               level={"H"}
               includeMargin={true}
             />
          </div>

          <div className="flex flex-col gap-3">
              <a
                href={guestLookupUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 px-4 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm break-all"
              >
                {guestLookupUrl}
              </a>

              <button
                onClick={() => setStep(2)}
                className="text-gray-500 hover:text-gray-800 text-sm font-medium mt-4"
              >
                ← Back to Adjustments
              </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col">
      <header className="mb-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <LayoutGrid size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SeatSmart <span className="text-indigo-600">AI</span></h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
           <span className={step === 1 ? "text-indigo-600" : ""}>1. Setup</span>
           <div className="w-8 h-px bg-gray-300"></div>
           <span className={step === 2 ? "text-indigo-600" : ""}>2. Assign</span>
           <div className="w-8 h-px bg-gray-300"></div>
           <span className={step === 3 ? "text-indigo-600" : ""}>3. Share</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pr-2">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </main>
    </div>
  );
};