export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          name: string;
          status: 'clean' | 'dirty' | 'occupied' | 'maintenance';
          capacity: number;
        };
        Insert: {
          id?: string;
          name: string;
          status: 'clean' | 'dirty' | 'occupied' | 'maintenance';
          capacity: number;
        };
        Update: {
          id?: string;
          name?: string;
          status?: 'clean' | 'dirty' | 'occupied' | 'maintenance';
          capacity?: number;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          room_id: string;
          guest: string;
          checkin: string;
          checkout: string;
          status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
        };
        Insert: {
          id?: string;
          room_id: string;
          guest: string;
          checkin: string;
          checkout: string;
          status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
        };
        Update: {
          id?: string;
          room_id?: string;
          guest?: string;
          checkin?: string;
          checkout?: string;
          status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
        };
        Relationships: [];
      };
      housekeeping: {
        Row: {
          id: string;
          room_id: string;
          type: 'cleaning' | 'linen' | 'inspection' | 'repair';
          assigned: string;
          status: 'pending' | 'in_progress' | 'done';
        };
        Insert: {
          id?: string;
          room_id: string;
          type: 'cleaning' | 'linen' | 'inspection' | 'repair';
          assigned: string;
          status: 'pending' | 'in_progress' | 'done';
        };
        Update: {
          id?: string;
          room_id?: string;
          type?: 'cleaning' | 'linen' | 'inspection' | 'repair';
          assigned?: string;
          status?: 'pending' | 'in_progress' | 'done';
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
