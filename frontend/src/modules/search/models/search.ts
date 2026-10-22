export interface SearchItemOrder {
  id: string;
  code: string;
  engineBrand: string;
  engineModel: string;
  clientName: string;
  status: string;
}

export interface SearchItemClient {
  id: string;
  fullName: string;
  identificationType: string;
  identification: string;
  phone: string | null;
  email: string | null;
}

export interface SearchItemUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface SearchItemInventory {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  category: string;
  stock: number;
}

export interface GlobalSearchResponse {
  query: string;
  results: {
    orders: SearchItemOrder[];
    clients: SearchItemClient[];
    users: SearchItemUser[];
    inventory: SearchItemInventory[];
  };
}

