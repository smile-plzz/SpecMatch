const KEYS = {
  library: 'specmatch:library', // { [gameId]: 'played' | 'liked' | 'disliked' }
  wishlist: 'specmatch:wishlist', // gameId[]
  prefs: 'specmatch:prefs', // { theme, specs, mood }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getLibrary() {
  return readJson(KEYS.library, {})
}

export function setLibraryStatus(gameId, status) {
  const lib = getLibrary()
  if (status) lib[gameId] = status
  else delete lib[gameId]
  writeJson(KEYS.library, lib)
  return lib
}

export function getWishlist() {
  return readJson(KEYS.wishlist, [])
}

export function toggleWishlist(gameId) {
  const list = getWishlist()
  const idx = list.indexOf(gameId)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(gameId)
  writeJson(KEYS.wishlist, list)
  return list
}

export function getPrefs() {
  return readJson(KEYS.prefs, { theme: 'dark', specs: null, mood: null })
}

export function setPrefs(patch) {
  const prefs = { ...getPrefs(), ...patch }
  writeJson(KEYS.prefs, prefs)
  return prefs
}
