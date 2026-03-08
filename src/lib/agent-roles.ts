type AgentRoleGroup =
  | 'extractor'
  | 'hypothesizer'
  | 'tester'
  | 'improver'
  | 'answerer'
  | 'default';

interface AgentRole {
  group: AgentRoleGroup;
  /** CSS color value for tint overlay and border */
  color: string;
  /** Tailwind-compatible border-left color class suffix */
  borderClass: string;
}

const ROLE_KEYWORDS: Array<{
  keywords: string[];
  group: AgentRoleGroup;
  color: string;
  borderClass: string;
}> = [
  {
    keywords: ['extractor'],
    group: 'extractor',
    color: '#66cccc',
    borderClass: 'border-l-trace-tool',
  },
  {
    keywords: ['hypothesizer', 'synthesizer', 'dispatcher'],
    group: 'hypothesizer',
    color: '#cc99ff',
    borderClass: 'border-l-trace-agent',
  },
  {
    keywords: ['tester', 'orchestrator'],
    group: 'tester',
    color: '#ffd700',
    borderClass: 'border-l-status-warning',
  },
  {
    keywords: ['improver'],
    group: 'improver',
    color: '#ff6666',
    borderClass: 'border-l-role-improver',
  },
  {
    keywords: ['answerer'],
    group: 'answerer',
    color: '#66ccaa',
    borderClass: 'border-l-trace-vocab',
  },
];

export function getAgentRole(agentName: string): AgentRole {
  const lower = agentName.toLowerCase();
  for (const entry of ROLE_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { group: entry.group, color: entry.color, borderClass: entry.borderClass };
    }
  }
  return { group: 'default', color: 'rgba(255,255,255,0.5)', borderClass: 'border-l-muted-foreground' };
}
