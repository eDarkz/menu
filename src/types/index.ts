export interface MenuItem {
  id: string;
  date: string;
  mainDish: string;
  side: string;
  beverage: string;
}

export interface Vote {
  id: string;
  menuId: string;
  rating: 'like' | 'dislike';
  timestamp: string;
}

export interface MenuStats {
  menuId: string;
  date: string;
  totalVotes: number;
  likes: number;
  dislikes: number;
  likePercentage: number;
}