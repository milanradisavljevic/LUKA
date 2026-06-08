import { useCallback } from 'react';
import type { Block } from '@lehrunterlagen/schema';
import type { AppAction } from '../lib/types';

export function useBlocks(dispatch: React.Dispatch<AppAction>) {
  const addBlock = useCallback(
    (block: Block) => dispatch({ type: 'ADD_BLOCK', block }),
    [dispatch],
  );

  const updateBlock = useCallback(
    (id: string, block: Partial<Block>) => dispatch({ type: 'UPDATE_BLOCK', id, block }),
    [dispatch],
  );

  const removeBlock = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_BLOCK', id }),
    [dispatch],
  );

  const reorderBlocks = useCallback(
    (bloecke: Block[]) => dispatch({ type: 'REORDER_BLOCKS', bloecke }),
    [dispatch],
  );

  return { addBlock, updateBlock, removeBlock, reorderBlocks };
}
