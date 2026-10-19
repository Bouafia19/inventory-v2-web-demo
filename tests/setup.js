if (typeof globalThis.localStorage === 'undefined') {
  let store = {}
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}
