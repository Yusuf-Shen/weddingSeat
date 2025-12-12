import { Guest, Table } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cleans and normalizes the raw guest list text.
 * Handles duplicates by appending numbers.
 * Sorts alphabetically.
 */
export const processGuestList = (rawText: string): Guest[] => {
  if (!rawText) return [];

  const lines = rawText.split(/\n|,/).map(s => s.trim()).filter(s => s.length > 0);
  
  // Dedup logic
  const nameCounts: Record<string, number> = {};
  const processedGuests: Guest[] = [];

  // Sort alphabetically first
  lines.sort((a, b) => a.localeCompare(b));

  lines.forEach(name => {
    const lowerName = name.toLowerCase();
    let displayName = name;

    if (nameCounts[lowerName]) {
      nameCounts[lowerName]++;
      displayName = `${name} (${nameCounts[lowerName]})`;
    } else {
      nameCounts[lowerName] = 1;
    }

    processedGuests.push({
      id: uuidv4(),
      originalName: name,
      normalizedName: displayName.toLowerCase(),
      displayName: displayName,
    });
  });

  return processedGuests;
};

/**
 * Distributes guests into tables.
 * Fills tables sequentially based on capacity.
 */
export const assignSeats = (guests: Guest[], tables: Table[]): { updatedTables: Table[], updatedGuests: Guest[], unassigned: Guest[] } => {
  const updatedTables = tables.map(t => ({ ...t, guests: [] as string[] }));
  const updatedGuests = [...guests];
  const unassigned: Guest[] = [];

  let currentTableIndex = 0;

  updatedGuests.forEach(guest => {
    if (currentTableIndex < updatedTables.length) {
      const table = updatedTables[currentTableIndex];
      
      if (table.guests.length < table.capacity) {
        // Assign
        table.guests.push(guest.id);
        guest.tableId = table.id;
        guest.seatNumber = table.guests.length; // 1-based seat index
      } else {
        // Table full, move to next
        currentTableIndex++;
        if (currentTableIndex < updatedTables.length) {
           const nextTable = updatedTables[currentTableIndex];
           nextTable.guests.push(guest.id);
           guest.tableId = nextTable.id;
           guest.seatNumber = nextTable.guests.length;
        } else {
          // No more tables
          guest.tableId = undefined;
          guest.seatNumber = undefined;
          unassigned.push(guest);
        }
      }
    } else {
      guest.tableId = undefined;
      guest.seatNumber = undefined;
      unassigned.push(guest);
    }
  });

  return { updatedTables, updatedGuests, unassigned };
};

/**
 * Manually assigns selected guests to a specific table.
 * Returns updated tables and guests with assignments.
 */
export const assignGuestsToTable = (
  guestIds: string[],
  tableId: string,
  guests: Guest[],
  tables: Table[]
): { updatedTables: Table[], updatedGuests: Guest[] } => {
  // Create deep copies
  const updatedTables = tables.map(t => ({ ...t, guests: [...t.guests] }));
  const updatedGuests = guests.map(g => ({ ...g }));
  
  // Remove guests from their current tables first
  guestIds.forEach(guestId => {
    const guest = updatedGuests.find(g => g.id === guestId);
    if (!guest) return;

    // Remove from old table if assigned
    if (guest.tableId) {
      const oldTableIndex = updatedTables.findIndex(t => t.id === guest.tableId);
      if (oldTableIndex !== -1) {
        updatedTables[oldTableIndex] = {
          ...updatedTables[oldTableIndex],
          guests: updatedTables[oldTableIndex].guests.filter(id => id !== guestId)
        };
      }
    }
  });

  // Assign to new table - create new guest objects to ensure React detects changes
  // Find target table index - use strict equality check
  const targetTableIndex = updatedTables.findIndex(t => t.id === tableId);
  if (targetTableIndex === -1) {
    // Debug: log available table IDs to help diagnose the issue
    console.warn(`Table with id "${tableId}" not found. Available tables:`, updatedTables.map(t => ({ id: t.id, name: t.name })));
    return { updatedTables, updatedGuests };
  }
  
  // Verify the target table exists and check ID matches
  const targetTable = updatedTables[targetTableIndex];
  if (!targetTable) {
    console.warn(`Table at index ${targetTableIndex} is undefined`);
    return { updatedTables, updatedGuests };
  }
  
  // Verify table ID matches (safety check for table1 issue)
  if (targetTable.id !== tableId) {
    console.warn(`Table ID mismatch: expected "${tableId}", got "${targetTable.id}"`);
    return { updatedTables, updatedGuests };
  }

  // Process guests one by one, updating the table state after each assignment
  for (const guestId of guestIds) {
    const guestIndex = updatedGuests.findIndex(g => g.id === guestId);
    if (guestIndex === -1) continue;

    // Always get the latest table state from the array (fresh reference each time)
    // Re-fetch from array to ensure we have the most up-to-date state
    const currentTable = updatedTables[targetTableIndex];
    if (!currentTable) {
      console.warn(`Table at index ${targetTableIndex} became undefined during assignment`);
      break;
    }
    
    // Verify table ID matches (safety check)
    if (currentTable.id !== tableId) {
      console.warn(`Table ID mismatch: expected ${tableId}, got ${currentTable.id}`);
      break;
    }
    
    const currentGuestsInTable = currentTable.guests.length;
    const tableCapacity = currentTable.capacity;
    
    // Check if table has capacity
    if (currentGuestsInTable < tableCapacity) {
      // Calculate seat number: start from 1, increment for each new guest
      const newSeatNumber = currentGuestsInTable + 1;
      
      // Create new table object with updated guests array
      updatedTables[targetTableIndex] = {
        ...currentTable,
        guests: [...currentTable.guests, guestId]
      };
      
      // Create new guest object instead of mutating
      updatedGuests[guestIndex] = {
        ...updatedGuests[guestIndex],
        tableId: tableId,
        seatNumber: newSeatNumber
      };
    } else {
      // Table is full, skip remaining guests
      break;
    }
  }

  return { updatedTables, updatedGuests };
};