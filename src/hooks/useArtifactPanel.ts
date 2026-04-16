/**
 * useArtifactPanel — State management for the artifact side panel (#239)
 */
import { useState, useCallback } from 'react';
import type { ArtifactPanelData } from '../components/ui/chat/ArtifactPanel';

export function useArtifactPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [artifact, setArtifact] = useState<ArtifactPanelData | null>(null);

  const openArtifact = useCallback((data: ArtifactPanelData) => {
    setArtifact(data);
    setIsOpen(true);
  }, []);

  const closeArtifact = useCallback(() => {
    setIsOpen(false);
    // Keep artifact data briefly for exit animation
    setTimeout(() => setArtifact(null), 200);
  }, []);

  return { isOpen, artifact, openArtifact, closeArtifact };
}
