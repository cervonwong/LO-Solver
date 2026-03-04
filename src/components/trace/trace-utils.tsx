import type { ToolCallEvent } from '@/lib/workflow-events';
import type { AgentGroup } from '@/lib/trace-utils';

export function isRuleTestTool(toolName: string): boolean {
  return toolName === 'testRule' || toolName === 'testRuleWithRuleset';
}

export function isSentenceTestTool(toolName: string): boolean {
  return toolName === 'testSentence' || toolName === 'testSentenceWithRuleset';
}

export function hasVocabularyEntries(toolCall: ToolCallEvent): boolean {
  if (!['addVocabulary', 'updateVocabulary', 'removeVocabulary'].includes(toolCall.data.toolName)) {
    return false;
  }
  const entries = toolCall.data.input.entries ?? toolCall.data.input.foreignForms;
  return Array.isArray(entries) && entries.length > 0;
}

export function isStartedStatus(result: Record<string, unknown>): boolean {
  return result.status === 'started';
}

export function formatConclusion(conclusion: string): string {
  switch (conclusion) {
    case 'ALL_RULES_PASS':
      return 'All rules pass';
    case 'NEEDS_IMPROVEMENT':
      return 'Needs improvement';
    case 'MAJOR_ISSUES':
      return 'Major issues found';
    default:
      return conclusion;
  }
}

export const jsonMarkdown = (label: string, data: unknown) =>
  `**${label}:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;

export type RenderItemType =
  | { kind: 'agent'; group: AgentGroup }
  | { kind: 'tool'; toolCall: ToolCallEvent }
  | { kind: 'bulk'; toolName: string; toolCalls: ToolCallEvent[] };

export function buildRenderItems(children: Array<AgentGroup | ToolCallEvent>): RenderItemType[] {
  const items: RenderItemType[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i]!;

    if ('type' in child && child.type === 'agent-group') {
      items.push({ kind: 'agent', group: child as AgentGroup });
      i++;
      continue;
    }

    // It's a tool call -- check for consecutive same-type calls
    const tc = child as ToolCallEvent;
    if (isStartedStatus(tc.data.result)) {
      i++;
      continue;
    }

    // Look ahead for consecutive same-tool calls
    const sameToolCalls: ToolCallEvent[] = [tc];
    let j = i + 1;
    while (j < children.length) {
      const next = children[j]!;
      if ('type' in next && next.type === 'agent-group') break;
      const nextTc = next as ToolCallEvent;
      if (isStartedStatus(nextTc.data.result)) {
        j++;
        continue;
      }
      if (nextTc.data.toolName !== tc.data.toolName) break;
      sameToolCalls.push(nextTc);
      j++;
    }

    if (sameToolCalls.length >= 4) {
      items.push({ kind: 'bulk', toolName: tc.data.toolName, toolCalls: sameToolCalls });
    } else {
      for (const call of sameToolCalls) {
        items.push({ kind: 'tool', toolCall: call });
      }
    }
    i = j;
  }

  return items;
}
