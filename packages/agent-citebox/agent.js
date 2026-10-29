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
export function connect({ gateway, model }) {
  const values = { baseURL: gateway.v1, apiKey: gateway.key };
  // A separate snapshot keeps model facts distinct from the app's own settings.
  // Unknown limits stay absent; never invent a capacity for an opaque model ID.
  if (model && typeof model.id === "string" && model.id) {
    const info = { id: model.id };
    for (const field of ["context", "output"]) {
      if (Number.isInteger(model[field]) && model[field] > 0 && model[field] <= 4294967295) info[field] = model[field];
    }
    if (Array.isArray(model.efforts)) {
      const efforts = model.efforts.filter(value => typeof value === "string" && /^[a-z][a-z0-9_-]{0,31}$/.test(value));
      if (efforts.length) info.efforts = efforts;
    }
    if (Object.keys(info).length > 1) values.modelInfo = info;
  }
  return values;
}
