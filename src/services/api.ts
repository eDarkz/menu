const API_BASE_URL = import.meta.env.DEV 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'https://back-menu.fly.dev');

// Fallback data when backend is unavailable
const FALLBACK_MENUS: ApiMenu[] = [
  {
    id: 'fallback-1',
    fecha: '17/8/2025',
    menu_ppal: 'Pollo a la plancha',
    acompanamiento: 'Arroz blanco y ensalada',
    bebida: 'Jugo natural',
    megusto: 0,
    nomegusto: 0,
  }
];

export interface ApiMenu {
  id: string;
  fecha: string; // DD/M/YYYY format
  menu_ppal: string;
  acompanamiento: string;
  bebida: string;
  megusto: number;
  nomegusto: number;
}

export interface CreateMenuRequest {
  fecha: string; // DD/M/YYYY
  menu_ppal: string;
  acompanamiento: string;
  bebida: string;
}

export interface UpdateMenuRequest {
  menu_ppal?: string;
  acompanamiento?: string;
  bebida?: string;
}

export interface VoteRequest {
  fecha: string; // DD/M/YYYY
  like: boolean;
}

export interface CommentRequest {
  fecha: string; // DD/M/YYYY
  menu_ppal: string;
  comentario: string;
}

class ApiService {
  private baseUrl: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error;
    
    for (let i = 0; i < this.retryCount; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // If we get a server error, wait before retrying
        if (!response.ok && response.status >= 500 && i < this.retryCount - 1) {
          console.warn(`Server error ${response.status}, retrying in ${(i + 1) * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Request failed, retrying in ${(i + 1) * 2} seconds... (${i + 1}/${this.retryCount})`);
        
        if (i < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        }
      }
    }
    
    throw lastError!;
  }

  // GET /menus
  async getAllMenus(): Promise<ApiMenu[]> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/menus`);
      if (!response.ok) {
        console.warn(`Backend error ${response.status}, using fallback data`);
        return FALLBACK_MENUS;
      }
      return response.json();
    } catch (error) {
      console.warn('Backend unavailable, using fallback data:', error);
      return FALLBACK_MENUS;
    }
  }

  // GET /menus/by-date?fecha=DD/M/YYYY
  async getMenuByDate(fecha: string): Promise<ApiMenu | null> {
    try {
      // Ensure fecha is in DD/M/YYYY format (e.g., "9/8/2025")
      const response = await this.fetchWithRetry(`${this.baseUrl}/menus/by-date?fecha=${fecha}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        console.warn(`Backend error ${response.status}, checking fallback data`);
        // Check if we have fallback data for this date
        const fallbackMenu = FALLBACK_MENUS.find(menu => menu.fecha === fecha);
        return fallbackMenu || null;
      }
      return response.json();
    } catch (error) {
      console.warn('Backend unavailable, checking fallback data:', error);
      // Check if we have fallback data for this date
      const fallbackMenu = FALLBACK_MENUS.find(menu => menu.fecha === fecha);
      return fallbackMenu || null;
    }
  }

  // POST /menus
  async createOrUpdateMenu(menuData: CreateMenuRequest): Promise<ApiMenu> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/menus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menuData),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating/updating menu: ${response.statusText}`);
    }
    return response.json();
  }

  // PUT /menus/:id
  async updateMenuById(id: string, menuData: UpdateMenuRequest): Promise<ApiMenu> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/menus/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menuData),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating menu: ${response.statusText}`);
    }
    return response.json();
  }

  // POST /vote
  async submitVote(voteData: VoteRequest): Promise<ApiMenu> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voteData),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting vote: ${response.statusText}`);
    }
    return response.json();
  }

  // POST /comment
  async submitComment(commentData: CommentRequest): Promise<{ ok: boolean }> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting comment: ${response.statusText}`);
    }
    return response.json();
  }

  // GET /notify/test?fecha=DD/M/YYYY
  async sendTestNotification(fecha: string): Promise<{ ok: boolean; enviado: boolean; fecha: string; detalle: string }> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/notify/test?fecha=${encodeURIComponent(fecha)}`);
    
    if (!response.ok) {
      throw new Error(`Error sending test notification: ${response.statusText}`);
    }
    return response.json();
  }

  // GET /notify/yesterday
  async sendYesterdayNotification(): Promise<{ ok: boolean; enviado: boolean; fecha: string; detalle: string }> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/notify/yesterday`);
    
    if (!response.ok) {
      throw new Error(`Error sending yesterday notification: ${response.statusText}`);
    }
    return response.json();
  }

  // GET /health
  async checkHealth(): Promise<{ ok: boolean }> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();