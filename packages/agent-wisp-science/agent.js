// This module runs in Magpie's moejs runtime: no Node APIs or dependencies.
export const agent = {
  id: "wisp-science",
  name: "Wisp Science",
  // Magpie detects the app by this command on PATH, or by the config once connected.
  // A plugin cannot yet declare a desktop app bundle or install folder, and must not
  // create the config folder just to be detected.
  bin: "wisp-science",
  config: "~/.config/wisp-science/magpie.json",
  format: "json",
  model: "model",
  ua: ["wisp-science"],
  notice: "Restart Wisp Science after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 Wisp Science。",
};

// Magpie writes the model and owns per-key backup/restoration.
export function connect({ gateway }) {
  return { baseURL: gateway.v1, apiKey: gateway.key };
}
