export type ItemKind = "CONSUMABLE" | "PPE" | "INSTRUMENT" | "SERVICE";
export type StockStatusType = "AMAN" | "MENIPIS" | "HABIS" | "BELUM_DIHITUNG";

export interface Category {
  id: string;
  code: string;
  name: string;
  kind: ItemKind;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
  qr_code?: string | null;
  is_active?: boolean;
}

export interface Item {
  id: string;
  code: string;
  legacy_code: string | null;
  name: string;
  category_id: string;
  kind: ItemKind;
  base_unit_id: string;
  min_stock: number;
  target_stock: number;
  abc_class: "A" | "B" | "C" | null;
  default_location_id: string | null;
  has_expiry: boolean;
  photo_path: string | null;
  is_active: boolean;
  created_at?: string;
  // Relational joins
  category?: Category | null;
  unit?: Unit | null;
  location?: Location | null;
  // Calculated stock
  current_qty?: number;
  stock_status?: StockStatusType;
}

export interface Person {
  id: string;
  employee_code: string;
  name: string;
  position: string;
  is_active: boolean;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string | null;
  is_active: boolean;
}
