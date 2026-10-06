/** The procedural state a case is currently in: what `cases` needs to know about it. */
export interface CaseProceduralState {
  id: number;
  name: string;
  isInitial: boolean;
}
