// This module runs in Magpie's moejs runtime: no Node APIs or dependencies.
export const agent = {
  id: "wisp-science",
  name: "Wisp Science",
  bin: "wisp-science",
  dir: "~/.config/wisp-science",
  config: "~/.config/wisp-science/magpie.json",
  format: "json",
  model: "model",
  ua: ["wisp-science"],
  notice: "Restart Wisp Science after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 Wisp Science。",
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
