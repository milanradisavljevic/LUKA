import { useCallback } from 'react';
import type { AppAction } from '../lib/types';
import { COMMANDS } from '../lib/commands';

export interface ParseResult {
  action: AppAction | AppAction[] | null;
  commandId: string | null;
  label: string;
}

export function useCommandParser() {
  const parse = useCallback((input: string): ParseResult => {
    const trimmed = input.trim();
    if (!trimmed) return { action: null, commandId: null, label: '' };

    for (const cmd of COMMANDS) {
      const match = trimmed.match(cmd.pattern);
      if (match) {
        try {
          const action = cmd.parse(match);
          return { action, commandId: cmd.id, label: cmd.label };
        } catch {
          continue;
        }
      }
    }

    return { action: null, commandId: 'unknown', label: '' };
  }, []);

  return { parse };
}
