export interface IFeature {
  load(): Promise<void>;
  unload(): Promise<void>;
}
