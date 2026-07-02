import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '../supabaseClient';
import { Project, Indicator, Outcome, Activity, SubActivity, Beneficiary, Issue, Staff, ProjectReflection, ProjectDocument } from '../types';
import { safeStorage } from './safeStorage';

// Global caches for schema discovery with comprehensive static fallback definitions
const fallbackSchemaColumns: Record<string, string[]> = {
  projects: [
    'id', 'name', 'location', 'owner', 'donor', 'status', 'start_date', 'deadline', 
    'progress', 'budget_approved', 'budget_actual', 'desc', 'note', 'goal', 
    'is_archived', 'archored_by', 'archived_at'
  ],
  project_indicators: [
    'id', 'project_id', 'title', 'indicator_name', 'target', 'current', 'unit', 'last_updated', 'last_value', 'project_name', 'notes', 'notes_updated_at',
    'type', 'actual', 'sort_order'
  ],
  project_outcomes: [
    'id', 'project_id', 'title', 'outcome_text', 'project_name', 'sort_order'
  ],
  project_activities: [
    'id', 'project_id', 'title', 'desc', 'pic', 'status', 'start_date', 'due_date', 'progress', 'notes', 'files', 'project_name', 'deadline', 'challenges'
  ],
  beneficiaries: [
    'id', 'name', 'full_name', 'phone', 'gender', 'birth_year', 'location', 'occupation', 'email', 'note', 'notes', 'registrations'
  ],
  issues: [
    'id', 'title', 'description', 'category', 'project_id', 'activity_id', 'severity', 'status', 
    'date_occurred', 'source_type', 'source_link', 'tags', 'updates',
    'project_name', 'incident_date', 'source', 'reported_by'
  ],
  staff: [
    'id', 'name', 'role', 'status'
  ],
  project_reflections: [
    'id', 'project_id', 'title', 'type', 'date', 'what_happened', 'what_worked', 'what_didnt', 'lesson', 'next_steps', 'contributor', 'project_name', 'reflection_date', 'lesson_learned', 'created_by'
  ],
  project_documents: [
    'id', 'project_name', 'category', 'file_name', 'mime_type', 'file_size', 
    'drive_file_id', 'drive_folder_id', 'web_view_link', 'description', 'created_at'
  ],
  project_sub_activities: [
    'id', 'parent_activity_id', 'title', 'desc', 'pic', 'status', 'priority', 'due'
  ]
};

const fallbackSchemaUuidColumns: Record<string, string[]> = {
  projects: ['id'],
  project_indicators: ['id', 'project_id'],
  project_outcomes: ['id', 'project_id'],
  project_activities: ['id', 'project_id'],
  beneficiaries: ['id'],
  issues: ['id', 'project_id', 'activity_id'],
  staff: ['id'],
  project_reflections: ['id', 'project_id'],
  project_sub_activities: ['id', 'parent_activity_id'],
  project_documents: ['id']
};

let schemaColumns: Record<string, string[]> = { ...fallbackSchemaColumns };
let schemaUuidColumns: Record<string, Set<string>> = {};
let isSchemaFetched = true;
let isSchemaFetchedAttempted = false;

// Initialize schemaUuidColumns with fallback lists
for (const [table, cols] of Object.entries(fallbackSchemaUuidColumns)) {
  schemaUuidColumns[table] = new Set(cols);
}

// Persistent string ID to UUID lookup table mapping the generated UUIDs back to client-friendly IDs
let uuidToOriginalMap: Record<string, string> = {};

// Load mapping from safe storage to handle app refreshes gracefully
try {
  const stored = safeStorage.getItem('dfw_uuid_mappings');
  if (stored) {
    uuidToOriginalMap = JSON.parse(stored);
  }
} catch (e) {
  // Safe fallback
}

// Register helper to store bidirectionally
function registerIdMapping(uuid: string, original: string) {
  const u = uuid.trim().toLowerCase();
  const o = original.trim();
  if (u && o && u !== o.toLowerCase()) {
    uuidToOriginalMap[u] = o;
    try {
      safeStorage.setItem('dfw_uuid_mappings', JSON.stringify(uuidToOriginalMap));
    } catch (e) {
      // Safe fallback
    }
  }
}

// Deterministic string-to-UUID converter to satisfy strict PostgreSQL uuid data types
function textToUuid(str: string): string {
  if (!str) return str;
  
  // Replace non-hex characters in an existing UUID-like structure so that older cached invalid keys heal automatically
  let sanitized = str.trim().toLowerCase();
  
  // Standard UUID format check (8-4-4-4-12)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(sanitized)) {
    return sanitized;
  }

  // Handle UUIDs containing non-hex characters (e.g. from historical caching containing 'w')
  // By swapping any non-hex character (outside 0-9, a-f) with '0'
  if (sanitized.length === 36 && (sanitized.match(/-/g) || []).length === 4) {
    let clean = '';
    for (let i = 0; i < sanitized.length; i++) {
      const char = sanitized[i];
      if (char === '-') {
        clean += '-';
      } else if (/[0-9a-f]/i.test(char)) {
        clean += char;
      } else {
        clean += '0'; // heal with '0'
      }
    }
    // Verify it is now matching UUID regex perfectly
    if (uuidRegex.test(clean)) {
      registerIdMapping(clean, str);
      return clean;
    }
  }

  // Simple, fast deterministic hash code generators
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const absHash = Math.abs(hash).toString(16).padStart(8, '0');
  
  let hash2 = 17;
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str.charCodeAt(i);
    hash2 = ((hash2 << 5) - hash2) + char;
    hash2 = hash2 & hash2;
  }
  const absHash2 = Math.abs(hash2).toString(16).padStart(8, '0');

  // Format as standard xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx UUID v4 compliant string
  const part1 = absHash;
  const part2 = '2026'; // Fixed segment representing system year
  const part3 = '4df0'; // Custom identifier segment representing DFW Indonesia (using '0' instead of 'w' for valid Hexadecimal syntax)
  const part4 = '8' + absHash2.substring(0, 3); // Starts with 8-11 pattern (uuid-conformant variant)
  const part5 = absHash2.substring(3).padEnd(12, 'f');

  const generatedUuid = `${part1}-${part2}-${part3}-${part4}-${part5}`.substring(0, 36);
  registerIdMapping(generatedUuid, str);
  return generatedUuid;
}

// Pre-seed mapping cache from any existing safeStorage items to guarantee seamless offline-to-online translations
try {
  const seedLocalData = (key: string) => {
    const raw = safeStorage.getItem(key);
    if (raw) {
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item) {
            if (item.id) {
              textToUuid(item.id); // This automatically registers the mapping for item.id!
            }
            if (item.projectId) {
              textToUuid(item.projectId); // This automatically registers the mapping for projectIds
            }
            if (item.activityId) {
              textToUuid(item.activityId);
            }
            if (item.parentActivityId) {
              textToUuid(item.parentActivityId);
            }
            if (item.pic && typeof item.pic === 'string') {
              textToUuid(item.pic);
            }
            if (item.name && typeof item.name === 'string') {
              textToUuid(item.name);
            }
          }
        });
      }
    }
  };
  seedLocalData('dfw_projects');
  seedLocalData('dfw_indicators');
  seedLocalData('dfw_outcomes');
  seedLocalData('dfw_activities');
  seedLocalData('dfw_beneficiaries');
  seedLocalData('dfw_issues');
  seedLocalData('dfw_reflections');
  seedLocalData('dfw_staff');
  seedLocalData('dfw_sub_activities');
} catch (e) {
  // Silent fallback
}

// Fetch Cache for fetchAllData to speed up load speeds and eliminate redundant query cycles
interface CacheEntry {
  data: any;
  timestamp: number;
}
const fetchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15000; // 15 seconds cache lifetime

export function clearFetchCache() {
  fetchCache.clear();
}

function getCacheKey(options?: { activeTab?: string; projectId?: string; page?: number; limit?: number }): string {
  const { activeTab = '', projectId = '', page = 0, limit = 0 } = options || {};
  return `${activeTab}:${projectId}:${page}:${limit}`;
}

// Recursive self-healing wrapper to rescue operations failing on schema discrepancies (e.g. missing columns)
async function safeUpsert(
  tableName: string, 
  item: any, 
  mappingFn: (v: any) => any, 
  retryCount = 0
): Promise<{ success: boolean; error?: any }> {
  if (!supabase) return { success: false };
  if (retryCount > 10) {
    console.error(`Exceeded maximum retry count of 10 for table ${tableName}`);
    return { success: false, error: new Error('Max retry limit exceeded') };
  }

  // Generate payload using the corresponding map function
  const dbPayload = mappingFn(item);
  const { error } = await supabase.from(tableName).upsert(dbPayload);

  if (error) {
    const isConstraintViolation = error.code === '23514';
    if (isConstraintViolation && error.message) {
      if (error.message.includes('issues_severity_check')) {
        console.warn(`[Self-Healing] Detected violation on constraint "issues_severity_check" when saving to table "${tableName}". Setting "severity" to null and retrying to ensure data is saved successfully.`);
        const healedMappingFn = (v: any) => {
          const payload = mappingFn(v);
          if (payload) {
            payload.severity = null;
          }
          return payload;
        };
        return safeUpsert(tableName, item, healedMappingFn, retryCount + 1);
      }
      if (error.message.includes('issues_status_check')) {
        console.warn(`[Self-Healing] Detected violation on constraint "issues_status_check" when saving to table "${tableName}". Setting "status" to null and retrying to ensure data is saved successfully.`);
        const healedMappingFn = (v: any) => {
          const payload = mappingFn(v);
          if (payload) {
            payload.status = null;
          }
          return payload;
        };
        return safeUpsert(tableName, item, healedMappingFn, retryCount + 1);
      }
    }

    const isPgrst204 = error.code === 'PGRST204';
    const isColumnMissing = error.message && (
      error.message.includes("Could not find the '") || 
      (error.message.includes("column") && error.message.includes("does not exist"))
    );

    if (isPgrst204 || isColumnMissing) {
      let missingCol: string | null = null;
      
      const match1 = error.message ? error.message.match(/Could not find the '([^']+)' column/) : null;
      const match2 = error.message ? error.message.match(/column "([^"]+)" of relation/) : null;
      const match3 = error.message ? error.message.match(/column "([^"]+)" does not exist/) : null;
      
      if (match1) missingCol = match1[1];
      else if (match2) missingCol = match2[1];
      else if (match3) missingCol = match3[1];

      if (missingCol) {
        console.warn(`[Self-Healing] Removing column "${missingCol}" from payload/schema cache for table "${tableName}" because it doesn't exist in DB.`);
        
        // Remove missing column from schemaColumns
        const currentCols = schemaColumns[tableName] || fallbackSchemaColumns[tableName] || Object.keys(dbPayload);
        schemaColumns[tableName] = currentCols.filter(c => c !== missingCol);
        
        // Recursively retry upsert with updated schema definitions
        return safeUpsert(tableName, item, mappingFn, retryCount + 1);
      }
    }

    console.error(`Error saving ${tableName} to Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`, dbPayload);
    return { success: false, error };
  }

  clearFetchCache();
  return { success: true };
}

// Generic Mapper to handle both snake_case in Supabase and camelCase in React
function toDbRow(data: any): any {
  if (!data) return data;
  const row: any = {};
  for (const key of Object.keys(data)) {
    // Map camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    row[snakeKey] = data[key];
  }
  return row;
}

function fromDbRow<T>(row: any): T {
  if (!row) return row;
  const result: any = {};
  for (const key of Object.keys(row)) {
    // Map snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    let val = row[key];
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (uuidToOriginalMap[lower]) {
        val = uuidToOriginalMap[lower];
      }
    }
    
    result[camelKey] = val;
  }
  
  // Specific mappings for table differences (e.g. indicator_name -> title, outcome_text -> title)
  if (row.indicator_name !== undefined) {
    result.title = row.indicator_name;
  } else if (result.indicatorName !== undefined) {
    result.title = result.indicatorName;
  }
  
  if (row.actual !== undefined && row.actual !== null && row.actual !== 0) {
    result.current = Number(row.actual);
  } else if (result.actual !== undefined && result.actual !== null && result.actual !== 0) {
    result.current = Number(result.actual);
  }
  
  if (row.outcome_text !== undefined) {
    result.title = row.outcome_text;
  } else if (result.outcomeText !== undefined) {
    result.title = result.outcomeText;
  }
  
  if (row.sort_order !== undefined) {
    result.sortOrder = Number(row.sort_order);
  }

  if (row.full_name !== undefined) {
    result.name = row.full_name;
  } else if (result.fullName !== undefined) {
    result.name = result.fullName;
  }

  if (row.birth_year !== undefined) {
    result.birthyear = row.birth_year ? Number(row.birth_year) : undefined;
  } else if (result.birthYear !== undefined) {
    result.birthyear = result.birthYear ? Number(result.birthYear) : undefined;
  }

  if (row.notes !== undefined && !result.note) {
    result.note = row.notes;
  }
  if (row.note !== undefined && !result.notes) {
    result.notes = row.note;
  }
  
  // project_activities mappings
  if (row.deadline !== undefined) {
    result.dueDate = row.deadline;
  } else if (result.deadline !== undefined) {
    result.dueDate = result.deadline;
  }
  if (row.challenges !== undefined) {
    result.challenges = row.challenges;
  }
  
  // project_reflections mappings
  if (row.reflection_date !== undefined) {
    result.date = row.reflection_date;
  } else if (result.reflectionDate !== undefined) {
    result.date = result.reflectionDate;
  }
  if (row.lesson_learned !== undefined) {
    result.lesson = row.lesson_learned;
  } else if (result.lessonLearned !== undefined) {
    result.lesson = result.lessonLearned;
  }
  if (row.created_by !== undefined) {
    result.contributor = row.created_by;
  } else if (result.createdBy !== undefined) {
    result.contributor = result.createdBy;
  }

  return result as T;
}

function normalizeBeneficiary(ben: any): Beneficiary {
  if (!ben) return ben;
  
  let regs = ben.registrations;
  if (typeof regs === 'string') {
    try {
      regs = JSON.parse(regs);
    } catch {
      regs = [];
    }
  }
  if (!regs || !Array.isArray(regs)) {
    regs = [];
  }

  ben.registrations = regs.map((r: any) => {
    if (!r || typeof r !== 'object') return r;
    
    const pIdRaw = r.projectId || r.project_id || '';
    const actIdRaw = r.activityId || r.activity_id || undefined;
    const subActIdRaw = r.subActivityId || r.sub_activity_id || undefined;
    
    const projectId = pIdRaw ? SupabaseSync.getOriginalId(pIdRaw) : '';
    const activityId = actIdRaw ? SupabaseSync.getOriginalId(actIdRaw) : undefined;
    const subActivityId = subActIdRaw ? SupabaseSync.getOriginalId(subActIdRaw) : undefined;
    
    return {
      projectId,
      activityId,
      subActivityId,
      activityName: r.activityName || r.activity_name || undefined,
      subActivityName: r.subActivityName || r.sub_activity_name || undefined,
      attendedDate: r.attendedDate || r.attended_date || undefined,
      isFreeLog: r.isFreeLog !== undefined ? r.isFreeLog : (r.is_free_log !== undefined ? r.is_free_log : undefined),
      note: r.note || undefined,
      source: r.source || undefined
    };
  });

  return ben as Beneficiary;
}

// Interceptor to filter out non-existent columns and dynamically convert text keys to UUID if required by DB schema
function cleanRowAndPrepare(tableName: string, row: any): any {
  if (!row) return row;
  
  // 1. Filter keys based on schema columns
  let finalRow = { ...row };
  const columns = schemaColumns[tableName];
  if (columns && columns.length > 0) {
    finalRow = {};
    for (const col of columns) {
      if (row[col] !== undefined) {
        finalRow[col] = row[col];
      }
    }
  }
  
  // 2. Perform robust UUID formatting for columns that expect UUID in Supabase
  // Merging dynamic schema UUID keys with our static fallbacks to guarantee 100% type safety
  const uuids = new Set<string>([
    ...(schemaUuidColumns[tableName] ? Array.from(schemaUuidColumns[tableName]) : []),
    ...(fallbackSchemaUuidColumns[tableName] || [])
  ]);
  
  for (const col of Object.keys(finalRow)) {
    if (uuids.has(col) || col === 'id' || col.endsWith('_id')) {
      const val = finalRow[col];
      if (typeof val === 'string') {
        if (val.trim() !== '') {
          finalRow[col] = textToUuid(val);
        } else {
          finalRow[col] = null;
        }
      }
    }
  }
  
  return finalRow;
}

// Convert UUIDs in row back to the original client format if they were saved as UUIDs?
// Since hash is one-way, we cannot mathematically reverse. But since our UUIDs are consistent,
// they fit perfectly, and the React app is completely fine using UUIDs for internal IDs and lookups.

// Global cache for mapping project IDs (in both standard and UUID format) to their friendly display names
const projectIdToName = new Map<string, string>();

// Helper to asynchronously fetch project_name if missing from memory cache
async function ensureProjectNameInCache(projectId: string): Promise<string> {
  if (!projectId) return 'DFW Project';
  const cleanId = textToUuid(projectId);
  let name = projectIdToName.get(projectId) || projectIdToName.get(cleanId);
  if (!name && supabase) {
    try {
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', cleanId)
        .maybeSingle();
      if (data && data.name) {
        projectIdToName.set(projectId, data.name);
        projectIdToName.set(cleanId, data.name);
        name = data.name;
      }
    } catch (e) {
      console.warn('Failed to resolve project name for ID:', projectId, e);
    }
  }
  return name || 'DFW Project';
}

// Map specific custom edge-cases to be 100% compliant with PostgreSQL columns
function mapProjectToDb(proj: Project) {
  const row = toDbRow(proj);
  row.is_archived = !!proj.isArchived;
  row.budget_approved = Number(proj.budgetApproved || 0);
  row.budget_actual = Number(proj.budgetActual || 0);
  row.archored_by = proj.archoredBy || null; // Respect types typo "archoredBy"
  return cleanRowAndPrepare('projects', row);
}

function mapIndicatorToDb(ind: Indicator) {
  const row = toDbRow(ind);
  row.project_id = ind.projectId;
  row.target = Number(ind.target || 0);
  row.current = Number(ind.current || 0);
  row.last_value = Number(ind.lastValue || 0);
  
  // Cross-compatibility mappings for database column variations
  row.title = ind.title;
  row.indicator_name = ind.title;
  row.actual = Number(ind.actual !== undefined ? ind.actual : ind.current || 0);
  row.type = ind.type || null;
  row.sort_order = ind.sortOrder !== undefined ? Number(ind.sortOrder) : 0;
  
  // Attach project_name to fulfill the database's not-null constraint
  const cleanId = textToUuid(ind.projectId);
  row.project_name = projectIdToName.get(ind.projectId) || projectIdToName.get(cleanId) || 'DFW Project';
  
  return cleanRowAndPrepare('project_indicators', row);
}

function mapOutcomeToDb(out: Outcome) {
  const row = toDbRow(out);
  row.project_id = out.projectId;
  
  // Cross-compatibility mappings for database column variations
  row.title = out.title;
  row.outcome_text = out.outcomeText || out.title;
  row.sort_order = out.sortOrder !== undefined ? Number(out.sortOrder) : 0;
  
  // Attach project_name to fulfill the database's not-null constraint
  const cleanId = textToUuid(out.projectId);
  row.project_name = projectIdToName.get(out.projectId) || projectIdToName.get(cleanId) || 'DFW Project';
  
  return cleanRowAndPrepare('project_outcomes', row);
}

function mapActivityToDb(act: Activity) {
  const row = toDbRow(act);
  row.project_id = act.projectId;
  row.progress = Number(act.progress || 0);
  row.pic = act.pic || null;
  // Ensure notes/files are safely stored as JSON
  row.notes = act.notes || [];
  row.files = act.files || [];
  
  // Cross-compatibility mappings for database column variations
  row.deadline = act.deadline || act.dueDate || null;
  row.challenges = act.challenges || null;
  
  // Attach project_name to fulfill any potential database's not-null constraint
  const cleanId = textToUuid(act.projectId);
  row.project_name = projectIdToName.get(act.projectId) || projectIdToName.get(cleanId) || 'DFW Project';
  
  return cleanRowAndPrepare('project_activities', row);
}

function mapSubActivityToDb(subAct: SubActivity) {
  const row = toDbRow(subAct);
  row.parent_activity_id = subAct.parentActivityId;
  row.pic = subAct.pic || null;
  row.title = subAct.title || '';
  row.desc = subAct.desc || null;
  row.status = subAct.status || 'Belum Mulai';
  row.priority = subAct.priority || 'Normal';
  row.due = subAct.due || null;
  return cleanRowAndPrepare('project_sub_activities', row);
}

function mapBeneficiaryToDb(ben: Beneficiary) {
  const row = toDbRow(ben);
  row.birth_year = ben.birthyear ? Number(ben.birthyear) : null;
  row.registrations = ben.registrations || [];
  row.full_name = ben.name; // Map local name field to database's full_name column
  row.note = ben.note || ben.notes || null;
  row.notes = ben.notes || ben.note || null;
  return cleanRowAndPrepare('beneficiaries', row);
}

function mapIssueToDb(issue: Issue) {
  const row = toDbRow(issue);
  row.project_id = issue.projectId || null;
  row.activity_id = issue.activityId || null;
  row.updates = issue.updates || [];
  return cleanRowAndPrepare('issues', row);
}

function mapReflectionToDb(ref: ProjectReflection) {
  const row = toDbRow(ref);
  row.project_id = ref.projectId;
  
  // Cross-compatibility mappings for database column variations
  row.reflection_date = ref.date || ref.reflectionDate || null;
  row.lesson_learned = ref.lesson || ref.lessonLearned || null;
  row.created_by = ref.contributor || ref.createdBy || null;
  
  // Attach project_name
  const cleanId = textToUuid(ref.projectId);
  row.project_name = projectIdToName.get(ref.projectId) || projectIdToName.get(cleanId) || 'DFW Project';
  
  return cleanRowAndPrepare('project_reflections', row);
}

// Exportable Sync APIs
export const SupabaseSync = {
  getOriginalId(uuid: string): string {
    if (!uuid) return uuid;
    const lower = uuid.trim().toLowerCase();
    return uuidToOriginalMap[lower] || uuid;
  },

  getUuid(originalId: string): string {
    return textToUuid(originalId);
  },

  // Discover columns and data types in Supabase using the PostgREST OpenAPI spec endpoint
  async fetchSchemaInfo(customUrl?: string, customKey?: string, force = false): Promise<boolean> {
    const isCustom = !!(customUrl || customKey);
    
    // If we already have a schema cached and are not forced to refresh/custom connect, immediately return true
    if (isSchemaFetched && !force && !isCustom) {
      return true;
    }
    
    // Prevent duplicated pending schema exploration requests
    if (isSchemaFetchedAttempted && !force && !isCustom) {
      return false;
    }

    const targetUrl = customUrl || supabaseUrl;
    const targetKey = customKey || supabaseAnonKey;
    
    if (!targetUrl || !targetKey) {
      return false;
    }
    
    try {
      isSchemaFetchedAttempted = true;
      // Build clean base REST URL endpoint
      const cleanBase = targetUrl.endsWith('/') ? targetUrl : `${targetUrl}/`;
      const restUrl = `${cleanBase}rest/v1/`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 1500); // 1.5 seconds fail-fast timeout to protect app responsiveness
      
      const res = await fetch(restUrl, {
        signal: controller.signal,
        headers: {
          'apikey': targetKey,
          'Authorization': `Bearer ${targetKey}`
        }
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        // Quietly fail schema spec exploration (OpenAPI schemas are often restricted by security policies)
        return false;
      }
      
      const spec = await res.json();
      const colMap: Record<string, string[]> = {};
      const uuidMap: Record<string, Set<string>> = {};
      
      if (spec && spec.definitions) {
        for (const tableName of Object.keys(spec.definitions)) {
          const tableDef = spec.definitions[tableName];
          if (tableDef && tableDef.properties) {
            colMap[tableName] = Object.keys(tableDef.properties);
            
            // Start with fallback UUID definitions for safety
            const uuids = new Set<string>(fallbackSchemaUuidColumns[tableName] || []);
            for (const propName of Object.keys(tableDef.properties)) {
              const prop = tableDef.properties[propName];
              if (prop && (
                prop.format === 'uuid' || 
                prop.type === 'uuid' || 
                (prop.description && prop.description.toLowerCase().includes('uuid')) ||
                propName === 'id' || propName.endsWith('_id')
              )) {
                uuids.add(propName);
              }
            }
            uuidMap[tableName] = uuids;
          }
        }
        
        schemaColumns = colMap;
        schemaUuidColumns = uuidMap;
        isSchemaFetched = true;
        console.log('Successfully fetched and cached Supabase DB definitions:', colMap);
        console.log('Found UUID-typed columns in Supabase:', uuidMap);
        return true;
      }
      return false;
    } catch (err) {
      // Quietly fall back to static structures without console error pollution
      return false;
    }
  },

  async fetchAllData(options?: {
    activeTab?: string;
    projectId?: string;
    page?: number;
    limit?: number;
  }) {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    const { activeTab, projectId, page, limit } = options || {};

    const cacheKey = getCacheKey(options);
    const cached = fetchCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      // Ensure we fetch schema beforehand to align parsing
      if (!isSchemaFetched) {
        await this.fetchSchemaInfo().catch(() => {});
      }

      // Determine which tables are active based on active tab to conserve database egress loads
      const tablesToFetch = new Set<string>();
      if (!activeTab) {
        const allTables = [
          'projects', 'project_indicators', 'project_outcomes', 'project_activities',
          'beneficiaries', 'issues', 'staff', 'project_sub_activities',
          'project_reflections', 'project_documents'
        ];
        allTables.forEach(t => tablesToFetch.add(t));
      } else {
        // Core list of projects always fetched for parent referencing
        tablesToFetch.add('projects');

        if (activeTab === 'dashboard') {
          tablesToFetch.add('project_indicators');
          tablesToFetch.add('project_activities');
          tablesToFetch.add('beneficiaries');
          tablesToFetch.add('issues');
        } else if (activeTab === 'projects' || activeTab === 'add_project' || activeTab === 'edit_project') {
          tablesToFetch.add('project_indicators');
          tablesToFetch.add('project_outcomes');
        } else if (activeTab === 'project_detail') {
          tablesToFetch.add('project_indicators');
          tablesToFetch.add('project_outcomes');
          tablesToFetch.add('project_activities');
          tablesToFetch.add('project_sub_activities');
          tablesToFetch.add('project_reflections');
          tablesToFetch.add('project_documents');
        } else if (activeTab === 'beneficiary') {
          tablesToFetch.add('beneficiaries');
        } else if (activeTab === 'issues') {
          tablesToFetch.add('issues');
        } else if (activeTab === 'staff') {
          tablesToFetch.add('staff');
          tablesToFetch.add('project_activities'); // Staff workload displays stats based on assigned activities
        } else if (activeTab === 'documents') {
          tablesToFetch.add('project_documents');
        } else if (activeTab === 'archive') {
          tablesToFetch.add('project_activities');
        } else {
          // Fallback to all tables for unrecognized tabs
          const allTables = [
            'projects', 'project_indicators', 'project_outcomes', 'project_activities',
            'beneficiaries', 'issues', 'staff', 'project_sub_activities',
            'project_reflections', 'project_documents'
          ];
          allTables.forEach(t => tablesToFetch.add(t));
        }
      }

      // Helper to dynamically harvest existing columns from fetched data
      const harvestColumns = (table: string, data: any[]) => {
        if (data && data.length > 0) {
          // Track and cache actual column names present inside rows returned from DB
          schemaColumns[table] = Object.keys(data[0]);
        }
      };

      const fetchGuarded = async (table: string) => {
        // If the table is not needed for the current active tab view, skip fetching to save bandwidth/egress!
        if (!tablesToFetch.has(table)) {
          return { data: undefined };
        }

        try {
          if (table === 'beneficiaries') {
            // Loop in batches of 1000 to fetch absolutely all beneficiaries
            let allData: any[] = [];
            let fromIndex = 0;
            let toIndex = 999;
            let hasMore = true;

            while (hasMore) {
              let query = supabase!.from(table).select('*').range(fromIndex, toIndex);
              
              if (projectId) {
                const uuidProjId = textToUuid(projectId);
                const hasProjectIdCol = fallbackSchemaUuidColumns[table]?.includes('project_id') || 
                                        (schemaColumns[table] && schemaColumns[table].includes('project_id'));
                if (hasProjectIdCol) {
                  query = query.eq('project_id', uuidProjId);
                }
              }

              const res = await query;
              if (res.error) {
                return { data: undefined, error: res.error };
              }

              const chunk = res.data || [];
              allData = [...allData, ...chunk];
              
              if (chunk.length < 1000) {
                hasMore = false;
              } else {
                fromIndex += 1000;
                toIndex += 1000;
              }
            }

            harvestColumns(table, allData);
            return { data: allData };
          }

          let query = supabase!.from(table).select('*');

          // Apply project filtering where appropriate to restrict downloading extraneous records
          if (projectId) {
            const uuidProjId = textToUuid(projectId);
            if (table === 'projects') {
              query = query.eq('id', uuidProjId);
            } else {
              const hasProjectIdCol = fallbackSchemaUuidColumns[table]?.includes('project_id') || 
                                      (schemaColumns[table] && schemaColumns[table].includes('project_id'));
              if (hasProjectIdCol) {
                query = query.eq('project_id', uuidProjId);
              }
            }
          }

          // Apply limit-offset range-based pagination only to the primary list of the current tab
          if (limit && page && page > 0) {
            const isPrimaryTable = 
              (activeTab === 'projects' && table === 'projects') ||
              (activeTab === 'dashboard' && table === 'projects') ||
              (activeTab === 'issues' && table === 'issues') ||
              (activeTab === 'staff' && table === 'staff') ||
              (activeTab === 'documents' && table === 'project_documents');

            if (isPrimaryTable) {
              const fromIndex = (page - 1) * limit;
              const toIndex = fromIndex + limit - 1;
              query = query.range(fromIndex, toIndex);
            }
          }

          const res = await query;
          if (res.error) {
            // Demote table errors (like missing 404 target tables) to quiet status handlers
            return { data: undefined, error: res.error };
          }
          harvestColumns(table, res.data || []);
          return res;
        } catch (err: any) {
          return { data: undefined, error: err };
        }
      };

      // Parallel fetches with guarded readers to insulate app against missing/invalid tables
      const [
        resProjects,
        resIndicators,
        resOutcomes,
        resActivities,
        resBeneficiaries,
        resIssues,
        resStaff,
        resSubActs,
        resReflections,
        resDocs
      ] = await Promise.all([
        fetchGuarded('projects'),
        fetchGuarded('project_indicators'),
        fetchGuarded('project_outcomes'),
        fetchGuarded('project_activities'),
        fetchGuarded('beneficiaries'),
        fetchGuarded('issues'),
        fetchGuarded('staff'),
        fetchGuarded('project_sub_activities'),
        fetchGuarded('project_reflections'),
        fetchGuarded('project_documents')
      ]);

      // Helper to process IDs consistently
      const convertIdIfSchemaDictates = (table: string, id: string): string => {
        if (schemaUuidColumns[table]?.has('id') && id) {
          return textToUuid(id);
        }
        return id;
      };

      // 1. Process staff first to register ID-to-name mappings before processing activities or sub-activities
      const staffProcessed = resStaff.data === undefined ? undefined : (resStaff.data || []).map(row => {
        const s = fromDbRow<Staff>(row);
        if (!s.status) s.status = 'active';
        if (s.name) {
          registerIdMapping(textToUuid(s.name), s.name);
        }
        return s;
      });

      // 2. Process projects first to populate name cache
      const projectsProcessed = resProjects.data === undefined ? undefined : (resProjects.data || []).map(row => {
        const item = fromDbRow<Project>(row);
        if (item.id && item.name) {
          projectIdToName.set(item.id, item.name);
          projectIdToName.set(textToUuid(item.id), item.name);
        }
        return item;
      });

      const resultData = {
        projects: projectsProcessed,
        indicators: resIndicators.data === undefined ? undefined : (resIndicators.data || []).map(row => {
          const item = fromDbRow<Indicator>(row);
          return item;
        }),
        outcomes: resOutcomes.data === undefined ? undefined : (resOutcomes.data || []).map(row => {
          const item = fromDbRow<Outcome>(row);
          return item;
        }),
        activities: resActivities.data === undefined ? undefined : (resActivities.data || []).map(row => {
          const act = fromDbRow<Activity>(row);
          // Parse JSON if returned as string
          if (typeof act.notes === 'string') {
            try { act.notes = JSON.parse(act.notes); } catch { act.notes = []; }
          }
          if (typeof act.files === 'string') {
            try { act.files = JSON.parse(act.files); } catch { act.files = []; }
          }
          if (!act.notes || !Array.isArray(act.notes)) {
            act.notes = [];
          }
          if (!act.files || !Array.isArray(act.files)) {
            act.files = [];
          }
          return act;
        }),
        beneficiaries: resBeneficiaries.data === undefined ? undefined : (resBeneficiaries.data || []).map(row => {
          const ben = fromDbRow<any>(row);
          return normalizeBeneficiary(ben);
        }),
        issues: resIssues.data === undefined ? undefined : (resIssues.data || []).map(row => {
          const issue = fromDbRow<Issue>(row);
          if (typeof issue.updates === 'string') {
            try { issue.updates = JSON.parse(issue.updates); } catch { issue.updates = []; }
          }
          return issue;
        }),
        staff: staffProcessed,
        subActivities: resSubActs.data === undefined ? undefined : (resSubActs?.data || []).map((row: any) => fromDbRow<SubActivity>(row)),
        reflections: resReflections.data === undefined ? undefined : (resReflections.data || []).map(row => fromDbRow<ProjectReflection>(row)),
        documents: resDocs.data === undefined ? undefined : (resDocs?.data || []).map((row: any) => fromDbRow<ProjectDocument>(row))
      };

      fetchCache.set(cacheKey, { data: resultData, timestamp: Date.now() });
      return resultData;
    } catch (error) {
      console.error('Failed to load initial data from Supabase:', error);
      return null;
    }
  },

  async fetchSingleTable(table: string): Promise<any[] | null> {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }
    try {
      if (!isSchemaFetched) {
        await this.fetchSchemaInfo().catch(() => {});
      }
      
      const res = await supabase.from(table).select('*');
      if (res.error) {
        return null;
      }
      
      if (res.data && res.data.length > 0) {
        schemaColumns[table] = Object.keys(res.data[0]);
      }
      
      const rows = res.data || [];
      
      if (table === 'projects') {
        return rows.map(row => {
          const item = fromDbRow<Project>(row);
          if (item.id && item.name) {
            projectIdToName.set(item.id, item.name);
            projectIdToName.set(textToUuid(item.id), item.name);
          }
          return item;
        });
      }
      if (table === 'project_indicators') {
        return rows.map(row => fromDbRow<Indicator>(row));
      }
      if (table === 'project_outcomes') {
        return rows.map(row => fromDbRow<Outcome>(row));
      }
      if (table === 'project_activities') {
        return rows.map(row => {
          const act = fromDbRow<Activity>(row);
          if (typeof act.notes === 'string') {
            try { act.notes = JSON.parse(act.notes); } catch { act.notes = []; }
          }
          if (typeof act.files === 'string') {
            try { act.files = JSON.parse(act.files); } catch { act.files = []; }
          }
          if (!act.notes || !Array.isArray(act.notes)) {
            act.notes = [];
          }
          if (!act.files || !Array.isArray(act.files)) {
            act.files = [];
          }
          return act;
        });
      }
      if (table === 'beneficiaries') {
        return rows.map(row => {
          const ben = fromDbRow<any>(row);
          return normalizeBeneficiary(ben);
        });
      }
      if (table === 'issues') {
        return rows.map(row => {
          const issue = fromDbRow<Issue>(row);
          if (typeof issue.updates === 'string') {
            try { issue.updates = JSON.parse(issue.updates); } catch { issue.updates = []; }
          }
          return issue;
        });
      }
      if (table === 'staff') {
        return rows.map(row => {
          const s = fromDbRow<Staff>(row);
          if (!s.status) s.status = 'active';
          if (s.name) {
            registerIdMapping(textToUuid(s.name), s.name);
          }
          return s;
        });
      }
      if (table === 'project_sub_activities') {
        return rows.map(row => fromDbRow<SubActivity>(row));
      }
      if (table === 'project_reflections') {
        return rows.map(row => fromDbRow<ProjectReflection>(row));
      }
      if (table === 'project_documents') {
        return rows.map(row => fromDbRow<ProjectDocument>(row));
      }
      
      return rows.map(row => fromDbRow<any>(row));
    } catch (err) {
      console.error(`Error fetching single table ${table}:`, err);
      return null;
    }
  },

  // Save/Upsert handlers using self-healing safeUpsert to protect against schema discrepancies
  async saveProject(proj: Project): Promise<boolean> {
    if (proj.id && proj.name) {
      projectIdToName.set(proj.id, proj.name);
      projectIdToName.set(textToUuid(proj.id), proj.name);
    }
    const res = await safeUpsert('projects', proj, mapProjectToDb);
    return res.success;
  },

  async deleteProject(projId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['projects']?.has('id') ? textToUuid(projId) : projId;
    const { error } = await supabase.from('projects').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting project from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveIndicator(ind: Indicator): Promise<boolean> {
    if (ind.projectId) {
      await ensureProjectNameInCache(ind.projectId);
    }
    const res = await safeUpsert('project_indicators', ind, mapIndicatorToDb);
    return res.success;
  },

  async deleteIndicator(indId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['project_indicators']?.has('id') ? textToUuid(indId) : indId;
    const { error } = await supabase.from('project_indicators').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting indicator from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveOutcome(out: Outcome): Promise<boolean> {
    if (out.projectId) {
      await ensureProjectNameInCache(out.projectId);
    }
    const res = await safeUpsert('project_outcomes', out, mapOutcomeToDb);
    return res.success;
  },

  async deleteOutcome(outId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['project_outcomes']?.has('id') ? textToUuid(outId) : outId;
    const { error } = await supabase.from('project_outcomes').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting outcome from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveActivity(act: Activity): Promise<boolean> {
    const res = await safeUpsert('project_activities', act, mapActivityToDb);
    return res.success;
  },

  async deleteActivity(actId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['project_activities']?.has('id') ? textToUuid(actId) : actId;
    const { error } = await supabase.from('project_activities').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting activity from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveSubActivity(subAct: SubActivity): Promise<boolean> {
    const res = await safeUpsert('project_sub_activities', subAct, mapSubActivityToDb);
    return res.success;
  },

  async deleteSubActivity(subActId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['project_sub_activities']?.has('id') ? textToUuid(subActId) : subActId;
    try {
      const { error } = await supabase.from('project_sub_activities').delete().eq('id', targetId);
      if (error) throw error;
      clearFetchCache();
      return true;
    } catch (e: any) {
      console.warn(`Could not delete sub-activity: [${e.code || '-'}] ${e.message || e}`);
      return false;
    }
  },

  async saveBeneficiary(ben: Beneficiary): Promise<boolean> {
    const res = await safeUpsert('beneficiaries', ben, mapBeneficiaryToDb);
    return res.success;
  },

  async deleteBeneficiary(benId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['beneficiaries']?.has('id') ? textToUuid(benId) : benId;
    const { error } = await supabase.from('beneficiaries').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting beneficiary from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveIssue(issue: Issue): Promise<boolean> {
    const res = await safeUpsert('issues', issue, mapIssueToDb);
    return res.success;
  },

  async deleteIssue(issueId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['issues']?.has('id') ? textToUuid(issueId) : issueId;
    const { error } = await supabase.from('issues').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting issue from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveStaff(staffMember: Staff): Promise<boolean> {
    const res = await safeUpsert('staff', staffMember, (item) => cleanRowAndPrepare('staff', toDbRow(item)));
    return res.success;
  },

  async deleteStaff(staffId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['staff']?.has('id') ? textToUuid(staffId) : staffId;
    const { error } = await supabase.from('staff').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting staff from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveReflection(ref: ProjectReflection): Promise<boolean> {
    const res = await safeUpsert('project_reflections', ref, mapReflectionToDb);
    return res.success;
  },

  async deleteReflection(refId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['project_reflections']?.has('id') ? textToUuid(refId) : refId;
    const { error } = await supabase.from('project_reflections').delete().eq('id', targetId);
    if (error) {
      console.error(`Error deleting reflection from Supabase: [${error.code}] ${error.message}. Detail: ${error.details || '-'}. Hint: ${error.hint || '-'}`);
      return false;
    }
    clearFetchCache();
    return true;
  },

  async saveDocument(doc: ProjectDocument): Promise<boolean> {
    const res = await safeUpsert('project_documents', doc, (item) => cleanRowAndPrepare('project_documents', toDbRow(item)));
    return res.success;
  },

  async deleteDocument(docId: string): Promise<boolean> {
    if (!supabase) return false;
    const targetId = schemaUuidColumns['project_documents']?.has('id') ? textToUuid(docId) : docId;
    try {
      const { error } = await supabase.from('project_documents').delete().eq('id', targetId);
      if (error) throw error;
      clearFetchCache();
      return true;
    } catch (e: any) {
      console.warn(`Could not delete document: [${e.code || '-'}] ${e.message || e}`);
      return false;
    }
  },

  cacheProjectName(id: string, name: string): void {
    if (!id || !name) return;
    projectIdToName.set(id, name);
    projectIdToName.set(textToUuid(id), name);
  }
};
