export interface IOperation {
  shouldStopPropagation(): boolean;
  shouldUpdate(): boolean;
  perform(): void;
}
