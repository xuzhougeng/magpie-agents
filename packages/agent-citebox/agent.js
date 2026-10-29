// This module runs in Magpie's moejs runtime: no Node APIs or dependencies.
export const agent = {
  id: "citebox",
  name: "CiteBox",
  // Magpie detects the app by this command on PATH, or by the config once connected.
  // A plugin cannot yet declare a desktop app bundle or install folder, and must not
  // create the config folder just to be detected.
  bin: "citebox",
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
