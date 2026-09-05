export type Role = 'admin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Category {
  id: number;
  key: string;
  label: string;
  icon: string;
  color: string;
  resource_count?: number;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export interface Resource {
  id: number;
  category_id: number;
  category?: Category;
  title: string;
  description: string | null;
  type: 'file' | 'link';
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
  url: string | null;
  questions: QuizQuestion[] | null;
  has_questions: boolean;
  question_count: number;
  view_count: number;
  download_count: number;
  like_count: number;
  comment_count: number;
  uploaded_by: number | null;
  liked_by_me?: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
}

export interface AdminComment {
  id: number;
  resource_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
  resource_title: string;
}

export interface AdminStats {
  resources: number;
  categories: number;
  users: number;
  likes: number;
  comments: number;
  views: number;
  downloads: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: string;
  resource_count: number;
}
