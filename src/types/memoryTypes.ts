export type MemoryType = 'factual' | 'episodic' | 'semantic' | 'procedural' | 'working';

export interface MemoryRecallData {
  memoryId?: string;
  memoryType: MemoryType;
  content: string;
  learnedAt?: string;
  confidence?: number;
  sourceSessionId?: string;
}
