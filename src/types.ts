export type User = {
  id: string;
  isPro: boolean;
  trustScore: number;
  karmaPoints?: number;
};

export type Intent = {
  id: string;
  authorId: string;
  authorName?: string;
  description: string;
  tags: string[];
  distance: number;
  state?: string;
  city?: string;
  area?: string;
  location?: string;
  category?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  hasLocationPin?: boolean;
  isVerifiedUser?: boolean;
  authorAvatar?: string;
};

export type ServiceProvider = {
  id: string;
  name: string;
  skills: string[];
  trustScore: number;
  rating: number;
  completedTasks: number;
  distance: number;
  isVerified?: boolean;
  hourlyRate?: number;
};

export type Screen = 'login' | 'home' | 'chat' | 'notifications' | 'pro' | 'settings' | 'guidelines' | 'roadmap' | 'report' | 'directory' | 'profile' | 'support' | 'mesh' | 'leaderboard' | 'professionals' | 'categories' | 'admin' | 'not_found';

export type Language = 'EN' | 'HI' | 'GU';

export interface JobPortalItem {
  id: string;
  type: 'job_seeker' | 'employer_vacancy';
  status: 'pending' | 'approved' | 'rejected';
  
  // Job Seeker specific
  fullName?: string;
  headline?: string;
  skills?: string[];
  experience?: string;
  expectedSalary?: string;
  education?: string;

  // Employer / Vacancy specific
  companyOrShopName?: string;
  jobRole?: string;
  vacancyType?: 'Full-Time' | 'Part-Time' | 'Hourly' | 'Contract';
  salaryOffered?: string;
  openingsCount?: number;
  urgency?: 'Immediate' | 'Within 1 Week' | 'Normal';

  // Common fields
  category: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  area: string;
  address?: string;
  description: string;
  photoOrLogoUrl?: string;
  website_url_hp?: string;
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export interface Profile {
  uid: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  skills?: string;
  address?: string;
  experience?: string;
  updated_at?: string;
}

export interface BroadcastPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  description: string;
  category: string;
  tags: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  expires_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  intent_id?: string;
}

