export interface BrandAssets {
  logo?: string;
  colors?: string[];
  typography?: string;
  guidelines?: string;
}

export interface ClientBudget {
  totalAllocated?: number;
  currency?: string;
}

export interface ClientWorkspace {
  id: string;
  name: string;
  brandAssets?: BrandAssets;
  notes?: string;
  budget?: ClientBudget;
  createdAt: number;
  updatedAt: number;
}
