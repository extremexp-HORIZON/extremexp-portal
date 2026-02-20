export type ExternalLinkParams = Record<string, string | number | undefined>

const TEMPLATE_VARIABLE_REGEX = /\{([a-zA-Z0-9_]+)\}/g

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ""
}

function replaceTemplateVariables(
  urlTemplate: string,
  params: ExternalLinkParams
): { resolvedUrl: string; usedParamKeys: Set<string> } {
  const usedParamKeys = new Set<string>()

  const resolvedUrl = urlTemplate.replace(TEMPLATE_VARIABLE_REGEX, (match, variableName: string) => {
    const value = params[variableName]
    if (!hasValue(value)) {
      return match
    }

    usedParamKeys.add(variableName)
    return encodeURIComponent(String(value))
  })

  return { resolvedUrl, usedParamKeys }
}

function removeUnresolvedTemplateQueryParams(url: string): string {
  return url
    .replace(/([?&])[^=&?#]+=(\{[^}]+\})(?=&|#|$)/g, (_, separator: string) =>
      separator === "?" ? "?" : ""
    )
    .replace(/\?&/g, "?")
    .replace(/&&/g, "&")
    .replace(/[?&]$/g, "")
}

function appendRemainingParams(
  url: string,
  params: ExternalLinkParams,
  usedParamKeys: Set<string>
): string {
  const remainingEntries = Object.entries(params).filter(
    ([key, value]) => hasValue(value) && !usedParamKeys.has(key)
  )

  if (remainingEntries.length === 0) {
    return url
  }

  try {
    const parsedUrl = new URL(url)
    for (const [key, value] of remainingEntries) {
      parsedUrl.searchParams.set(key, String(value))
    }
    return parsedUrl.toString()
  } catch {
    const queryString = remainingEntries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&")

    if (!queryString) {
      return url
    }

    return `${url}${url.includes("?") ? "&" : "?"}${queryString}`
  }
}

/**
 * Resolves a URL template by replacing variables like `{experimentId}` with provided values.
 *
 * Behavior:
 * - Replaces matching template variables with URL-encoded values
 * - Removes unresolved query params that still contain template variables
 * - Appends any remaining parameters as query params
 */
export function resolveExternalLink(urlTemplate: string, params: ExternalLinkParams = {}): string {
  const { resolvedUrl, usedParamKeys } = replaceTemplateVariables(urlTemplate, params)
  const cleanedUrl = removeUnresolvedTemplateQueryParams(resolvedUrl)
  return appendRemainingParams(cleanedUrl, params, usedParamKeys)
}
