import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Category, Person, Location, Unit } from "@/types/inventory";

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
        item.name.toLowerCase().includes(s) ||
        item.code.toLowerCase().includes(s) ||
        (item.legacy_code && item.legacy_code.toLowerCase().includes(s))
    );
  }

  return items;
}
