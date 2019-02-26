interface TransformConfig {
  whitelist?: string[];
  blacklist?: string[];
}

export default function createTransform(inbound, outbound, config: TransformConfig) {
  const whitelist = config.whitelist || null;
  const blacklist = config.blacklist || null;

  function whitelistBlacklistCheck(key) {
    if (whitelist && whitelist.indexOf(key) === -1) {
      return true;
    }
    if (blacklist && blacklist.indexOf(key) !== -1) {
      return true;
    }
    return false;
  }

  return {
    in: (state: Object, key: string, fullState: Object) =>
      !whitelistBlacklistCheck(key) && inbound
        ? inbound(state, key, fullState)
        : state,
    out: (state: Object, key: string, fullState: Object) =>
      !whitelistBlacklistCheck(key) && outbound
        ? outbound(state, key, fullState)
        : state,
  };
}
