import { Vault } from "obsidian";

export function getObsidianTabsSettigns(vault: Vault) {
  return {
    useTab: true,
    tabSize: 4,
    ...(vault as any).config,
  };
}
