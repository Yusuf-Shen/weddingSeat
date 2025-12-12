export interface Guest {
  id: string;
  originalName: string;
  normalizedName: string; // Lowercase for searching
  displayName: string;
  tableId?: string;
  seatNumber?: number;
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  guests: string[]; // Array of Guest IDs
}

export enum AppMode {
  ADMIN = 'ADMIN',
  GUEST_LOOKUP = 'GUEST_LOOKUP',
}

export interface AssignmentResult {
  tables: Table[];
  guests: Guest[];
  unassignedGuests: Guest[];
}

export interface TableGenerationConfig {
  theme: string;
  count: number;
}