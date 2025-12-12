import React from 'react';
import { Table, Guest } from '../types';
import { Users, Edit2, X } from 'lucide-react';

interface TableCardProps {
  table: Table;
  assignedGuests: Guest[];
  onRename: (id: string, newName: string) => void;
  onRemoveGuest?: (guestId: string) => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, assignedGuests, onRename, onRemoveGuest }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(table.name);

  const handleSave = () => {
    if (editName.trim()) {
      onRename(table.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <h3 
            className="font-semibold text-gray-800 flex items-center gap-2 cursor-pointer group w-full"
            onClick={() => setIsEditing(true)}
            title="Click to rename"
          >
            {table.name}
            <Edit2 size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
        )}
        <div className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
          <Users size={12} />
          {assignedGuests.length}/{table.capacity}
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
        {assignedGuests.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4 italic">Empty table</div>
        ) : (
          <ul className="space-y-2">
            {assignedGuests.map((guest) => (
              <li key={guest.id} className="text-sm flex justify-between items-center group">
                <span className="text-gray-700 truncate flex-1">{guest.displayName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-500 font-mono bg-indigo-50 px-1.5 py-0.5 rounded opacity-70 group-hover:opacity-100">
                    #{guest.seatNumber}
                  </span>
                  {onRemoveGuest && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveGuest(guest.id);
                      }}
                      className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      title="Remove guest"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};