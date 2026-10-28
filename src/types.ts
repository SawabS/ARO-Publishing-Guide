// Structured data model shared by every view. The JSON in /data is the source of truth;
// scripts/build.mjs validates it and generates src/generated/data.ts typed as AppData.

export type Status = 'mandatory' | 'conditional' | 'recommended' | 'informational';
export type Guidance = 'official' | 'general' | 'project';
export type Hue = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'papaya' | 'mint';

export interface Source {
  id: string; title: string; org: string; official: boolean; aroLinked?: boolean;
  type: 'page' | 'document' | 'portal' | 'tool'; url: string;
  check: 'fetched' | 'partial' | 'unreachable' | 'listed'; verified: string; notes?: string;
}

export interface Requirement {
  id: string; title: string; topic: string; status: Status; stages: string[]; sources: string[];
  rule: string; explain: string; how: string; conflicts?: string[];
}

export interface ConflictPosition { source: string; claim: string }
export interface Conflict {
  id: string; title: string; severity: 'high' | 'medium' | 'low';
  status: 'unresolved' | 'reconciled' | 'informational';
  positions: ConflictPosition[]; analysis: string; recommendation: string; affects: string[];
}

export interface Resource {
  id: string; title: string; purpose: string; format: string;
  kind: 'download' | 'page' | 'portal' | 'tool'; org: string; source: string;
  required: 'required' | 'optional' | 'conditional'; stages: string[]; howTo?: string; doc?: boolean;
}

export interface Lesson { id: string; title: string; tag: Guidance; body: string[] }
export interface ChecklistItem { id: string; label: string; auto?: string; dependsOn?: string[]; conflict?: string }
export interface PublicationStage {
  id: string; num: number; title: string; hue: Hue; short: string; accomplishes: string;
  prerequisites: string[]; actions: string[]; requirements: string[]; resources: string[];
  lessons: Lesson[]; checklist: ChecklistItem[]; next: string;
}

export interface Person {
  name: string; role: string; group: 'executive' | 'advisory' | 'management';
  affiliation: string; country: string; decides: boolean; duties?: string;
  profiles: { label: string; url: string }[];
}
export interface JournalFacts { [k: string]: string }

export interface ResearchSection {
  id: string; name: string; aro: string[]; purpose: string; evidence: string;
  content: string[]; example: string; done: string[];
}
export interface ResearchData {
  summary: string; sections: ResearchSection[];
  topics: { id: string; name: string; note: string }[];
  matrix: { claim: string; evidence: string; where: string; strength: string }[];
}

export type NodeKind = 'stage' | 'requirement' | 'conflict' | 'source' | 'document' | 'tool' | 'section' | 'process' | 'artifact';
export type Relation = 'requires' | 'depends_on' | 'explained_by' | 'downloaded_from' | 'submitted_during' | 'reviewed_under' | 'leads_to' | 'conflicts_with';

export interface GraphNodeDef { id: string; kind: NodeKind; label: string; detail?: string; stage?: string }
export interface GraphEdge { from: string; to: string; rel: Relation }
export interface GraphData { nodes: GraphNodeDef[]; edges: GraphEdge[] }

export interface HandbookTopic { id: string; title: string; intro: string; module?: string }

export interface AppData {
  verifiedDate: string;
  sources: Source[]; requirements: Requirement[]; conflicts: Conflict[]; resources: Resource[];
  stages: PublicationStage[]; journal: JournalFacts; people: Person[]; research: ResearchData;
  graph: GraphData; handbook: HandbookTopic[];
}

export interface ProgressRecord {
  checked: Record<string, string>;        // checklist item id → ISO date ticked
  confirmed: Record<string, string>;      // conflict id → note recorded after asking the office
  visited: Record<string, string>;        // stage id → last visit
  research: Record<string, boolean>;      // research section criteria ticks
  lastRoute: string;
  quiz: Record<string, string>;           // quiz id → chosen answer
  tourDone: boolean;
  auto: Record<string, { verdict: string; at: string }>; // last automated .docx verdicts (no manuscript text is stored)
  autoFile: string;
}
