import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Category, Person, Location, Unit, Project } from "@/types/inventory";

export interface StockMovementWithDetails {
  id: string;
  item_id: string;
  type: "IN" | "OUT" | "ADJUST" | "REVERSAL";
  qty: number;
  location_id: string | null;
  project_id: string | null;
  user_id: string | null;
  person_id: string | null;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
  item?: { id: string; code: string; name: string; base_unit_id: string; unit?: { name: string } } | null;
  person?: { id: string; name: string; position: string; employee_code: string } | null;
  project?: { id: string; name: string; client: string | null } | null;
  location?: { id: string; name: string } | null;
}

export interface UnitConversion {
  id: string;
  item_id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: number;
  from_unit?: { id: string; name: string } | null;
  to_unit?: { id: string; name: string } | null;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, code, name, kind")
    .order("code");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

export async function getUnits(): Promise<Unit[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Error fetching units:", error);
    return [];
  }
  return data || [];
}

export async function getLocations(): Promise<Location[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, qr_code, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
  return data || [];
}

export async function getProjects(): Promise<Project[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
  return data || [];
}

export async function getPeople(search?: string): Promise<Person[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("people")
    .select("id, employee_code, name, position, is_active, created_at")
    .eq("is_active", true)
    .order("employee_code");

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`name.ilike.%${s}%,position.ilike.%${s}%,employee_code.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching people:", error);
    return [];
  }
  return data || [];
}

export async function getItems(options?: {
  categoryCode?: string;
  search?: string;
}): Promise<Item[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("items")
    .select(`
      id,
      code,
      legacy_code,
      name,
      category_id,
      kind,
      base_unit_id,
      min_stock,
      target_stock,
      abc_class,
      default_location_id,
      has_expiry,
      photo_path,
      is_active,
      created_at,
      category:categories(id, code, name, kind),
      unit:units(id, name),
      location:locations(id, name)
    `)
    .eq("is_active", true)
    .order("code");

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching items:", error);
    return [];
  }

  let items: Item[] = (data as unknown as Item[]) || [];

  if (options?.categoryCode && options.categoryCode !== "ALL") {
    items = items.filter((item) => item.category?.code === options.categoryCode);
  }

  if (options?.search && options.search.trim()) {
    const s = options.search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q_clean(s)) ||
        item.code.toLowerCase().includes(q_clean(s)) ||
        (item.legacy_code && item.legacy_code.toLowerCase().includes(q_clean(s)))
    );
  }

  return items;
}

function q_clean(val: string): string {
  return val.trim().toLowerCase();
}

export async function getUnitConversions(itemId?: string): Promise<UnitConversion[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("unit_conversions")
    .select(`
      id,
      item_id,
      from_unit_id,
      to_unit_id,
      factor,
      from_unit:units!from_unit_id(id, name),
      to_unit:units!to_unit_id(id, name)
    `);

  if (itemId) {
    query = query.eq("item_id", itemId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching unit conversions:", error);
    return [];
  }
  return (data as unknown as UnitConversion[]) || [];
}

export async function getMovements(limit = 50): Promise<StockMovementWithDetails[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(`
      id,
      item_id,
      type,
      qty,
      location_id,
      project_id,
      user_id,
      person_id,
      ref_type,
      ref_id,
      note,
      occurred_at,
      created_at,
      item:items(id, code, name, base_unit_id, unit:units(name)),
      person:people(id, name, position, employee_code),
      project:projects(id, name, client),
      location:locations(id, name)
    `)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching stock movements:", error);
    return [];
  }
  return (data as unknown as StockMovementWithDetails[]) || [];
}

export async function getCurrentStockMap(): Promise<Record<string, number>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("stock_movements").select("item_id, type, qty");
  if (error || !data) return {};

  const map: Record<string, number> = {};
  for (const m of data) {
    const current = map[m.item_id] || 0;
    if (m.type === "IN") map[m.item_id] = current + Number(m.qty);
    else if (m.type === "OUT") map[m.item_id] = current - Number(m.qty);
    else if (m.type === "ADJUST") map[m.item_id] = current + Number(m.qty);
    else if (m.type === "REVERSAL") map[m.item_id] = current - Number(m.qty);
  }
  return map;
}
