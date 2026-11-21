import { createAdminClient } from "@/lib/supabase/admin";
import type { Item, Category, Person, Location, Unit, Project } from "@/types/inventory";
export type { Item, Category, Person, Location, Unit, Project };

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

export interface Profile {
  id: string;
  full_name: string;
  role: "STAFF" | "AHLI" | "ADMIN" | "MANAJER";
  person_id: string | null;
  person?: { name: string; position: string; employee_code: string } | null;
}

export interface StockTakeWithDetails {
  id: string;
  name: string;
  scope: Record<string, unknown> | null;
  status: "DRAFT" | "COUNTING" | "REVIEW" | "APPROVED" | "POSTED";
  cutoff_at: string;
  started_by: string | null;
  approved_by: string | null;
  posted_at: string | null;
  created_at: string;
  starter?: { id: string; full_name: string; role: string } | null;
  approver?: { id: string; full_name: string; role: string } | null;
  lines_count?: number;
  counted_count?: number;
}

export interface StockTakeLineWithItem {
  id: string;
  stock_take_id: string;
  item_id: string;
  system_qty: number;
  counted_qty: number | null;
  recount_qty: number | null;
  counted_by: string | null;
  counted_by_person_id: string | null;
  reason: string | null;
  photo_path: string | null;
  status: string;
  item?: {
    id: string;
    code: string;
    name: string;
    kind: string;
    photo_path?: string | null;
    unit?: { name: string };
    category?: { name: string; code: string };
  };
  counter?: { id: string; name: string; position: string };
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

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, person_id, person:people(name, position, employee_code)")
    .order("full_name");

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
  return (data as unknown as Profile[]) || [];
}

export async function getItems(options?: {
  categoryCode?: string;
  search?: string;
  includeInactive?: boolean;
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
    .order("code");

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

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

export async function getStockTakes(): Promise<StockTakeWithDetails[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stock_takes")
    .select(`
      id,
      name,
      scope,
      status,
      cutoff_at,
      started_by,
      approved_by,
      posted_at,
      created_at,
      starter:profiles!started_by(id, full_name, role),
      approver:profiles!approved_by(id, full_name, role),
      lines:stock_take_lines(id, counted_qty)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock takes:", error);
    return [];
  }

  return (
    data?.map((st) => {
      const lines = (st.lines as Array<{ id: string; counted_qty: number | null }>) || [];
      const countedCount = lines.filter((l) => l.counted_qty !== null).length;
      return {
        id: st.id,
        name: st.name,
        scope: st.scope as Record<string, unknown> | null,
        status: st.status,
        cutoff_at: st.cutoff_at,
        started_by: st.started_by,
        approved_by: st.approved_by,
        posted_at: st.posted_at,
        created_at: st.created_at,
        starter: st.starter as unknown as { id: string; full_name: string; role: string } | null,
        approver: st.approver as unknown as { id: string; full_name: string; role: string } | null,
        lines_count: lines.length,
        counted_count: countedCount,
      };
    }) || []
  );
}

export async function getStockTakeById(id: string): Promise<{
  stockTake: StockTakeWithDetails | null;
  lines: StockTakeLineWithItem[];
}> {
  const supabase = createAdminClient();
  const { data: st, error: stError } = await supabase
    .from("stock_takes")
    .select(`
      id,
      name,
      scope,
      status,
      cutoff_at,
      started_by,
      approved_by,
      posted_at,
      created_at,
      starter:profiles!started_by(id, full_name, role),
      approver:profiles!approved_by(id, full_name, role)
    `)
    .eq("id", id)
    .single();

  if (stError || !st) {
    console.error("Error fetching stock take:", stError);
    return { stockTake: null, lines: [] };
  }

  const { data: lines, error: linesError } = await supabase
    .from("stock_take_lines")
    .select(`
      id,
      stock_take_id,
      item_id,
      system_qty,
      counted_qty,
      recount_qty,
      counted_by,
      counted_by_person_id,
      reason,
      photo_path,
      status,
      item:items(
        id,
        code,
        name,
        kind,
        photo_path,
        unit:units(name),
        category:categories(name, code)
      ),
      counter:people!counted_by_person_id(id, name, position)
    `)
    .eq("stock_take_id", id)
    .order("created_at", { ascending: true });

  if (linesError) {
    console.error("Error fetching stock take lines:", linesError);
  }

  return {
    stockTake: {
      ...st,
      scope: st.scope as Record<string, unknown> | null,
      starter: st.starter as unknown as { id: string; full_name: string; role: string } | null,
      approver: st.approver as unknown as { id: string; full_name: string; role: string } | null,
    },
    lines: (lines as unknown as StockTakeLineWithItem[]) || [],
  };
}
