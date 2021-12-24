export interface Operation {
  shouldStopPropagation(): boolean;
  shouldUpdate(): boolean;
  perform(): void;
}
