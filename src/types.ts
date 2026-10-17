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
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  hasLocationPin?: boolean;
  isVerifiedUser?: boolean;
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

export type Screen = 'login' | 'home' | 'chat' | 'notifications' | 'pro' | 'settings' | 'guidelines' | 'roadmap' | 'report' | 'directory' | 'profile' | 'support' | 'mesh' | 'leaderboard' | 'professionals' | 'categories' | 'admin';

export type Language = 'EN' | 'HI' | 'GU' | 'MR' | 'BN' | 'TA' | 'TE' | 'KN' | 'PA' | 'ML';

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
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

