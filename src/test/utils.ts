import { createDefaultState } from '@/lib/appState';
import { useVocabStore } from '@/lib/store';

export const resetStore = () => {
  const baseState = createDefaultState();
  useVocabStore.setState({
    ...baseState,
    isReady: true,
    currentQuizResults: [],
  });
};
