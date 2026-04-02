/**
 * Delegation Teams Registry
 *
 * Maps tool names that represent team delegation to their display metadata.
 * When Mate delegates work to a sub-team (e.g. isa_vibe, isa_trade),
 * these entries power the inline DelegationCard UI.
 */

export const DELEGATION_TEAMS: Record<string, { label: string; icon: string; color: string }> = {
  isa_vibe: { label: 'Dev Team', icon: '\u{1F4BB}', color: '#3b82f6' },
  isa_trade: { label: 'Trading Team', icon: '\u{1F4C8}', color: '#10b981' },
  isa_creative: { label: 'Creative Team', icon: '\u{1F3A8}', color: '#8b5cf6' },
  isa_marketing: { label: 'Marketing Team', icon: '\u{1F4E3}', color: '#f59e0b' },
};

export function isDelegationTool(toolName: string): boolean {
  return toolName in DELEGATION_TEAMS;
}
