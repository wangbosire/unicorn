type CookieJar = Map<string, string>

const cookieJar: CookieJar = new Map()

function serializeCookies(): string {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function applyCookieMutation(raw: string): void {
  const [nameValue, ...attributes] = raw.split(';').map((part) => part.trim())
  if (!nameValue) {
    return
  }

  const [name, ...valueParts] = nameValue.split('=')
  if (!name) {
    return
  }

  const value = valueParts.join('=')
  const maxAgeAttr = attributes.find((attr) =>
    attr.toLowerCase().startsWith('max-age=')
  )
  const maxAge = maxAgeAttr ? Number(maxAgeAttr.split('=')[1]) : undefined

  if (maxAge === 0) {
    cookieJar.delete(name)
    return
  }

  cookieJar.set(name, value)
}

Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    get cookie() {
      return serializeCookies()
    },
    set cookie(raw: string) {
      applyCookieMutation(raw)
    },
  },
})
