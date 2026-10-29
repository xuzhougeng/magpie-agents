// This module runs in Magpie's moejs runtime: no Node APIs or dependencies.
export const agent = {
  id: "wispterm",
  name: "WispTerm",
  bin: "wispterm",
  dir: "~/.config/wispterm",
  config: "~/.config/wispterm/magpie.json",
  format: "json",
  model: "model",
  ua: ["wispterm"],
  notice: "Restart WispTerm after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 WispTerm。",
};

// Magpie writes the model and owns per-key backup/restoration.
export function connect({ gateway }) {
  return { baseURL: gateway.v1, apiKey: gateway.key };
}
