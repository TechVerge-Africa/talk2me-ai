export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export type UserRole = 'host' | 'participant' | 'admin';
