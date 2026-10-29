// This module runs in Magpie's moejs runtime: no Node APIs or dependencies.
export const agent = {
  id: "citebox",
  name: "CiteBox",
  bin: "citebox",
  dir: "~/.config/citebox",
  config: "~/.config/citebox/magpie.json",
  format: "json",
  model: "model",
  ua: ["citebox"],
  notice: "CiteBox reads changes before the next operation. CiteBox 会在下一次操作时读取连接、模型切换或断开。",
};

// Magpie writes the model and owns per-key backup/restoration.
export function connect({ gateway }) {
  return { baseURL: gateway.v1, apiKey: gateway.key };
}
