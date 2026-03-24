import { Check, ChevronDown, Copy } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ShareModal, isShareDismissed } from '@/components/ShareModal'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/pages/PageHeader'

interface MatchResult {
  index: number
  match: string
  groups: Record<string, string | undefined>
  numberedGroups: (string | undefined)[]
}

const COMMON_PATTERNS: { key: string; pattern: string; flags: string; testString: string }[] = [
  {
    key: 'email',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    flags: 'g',
    testString: 'Contact us at info@example.com or support@company.org',
  },
  {
    key: 'url',
    pattern: 'https?://[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+',
    flags: 'g',
    testString: 'Visit https://example.com or http://test.org/path?q=1',
  },
  {
    key: 'phone',
    pattern: '\\+?\\d{1,4}[-.\\s]?\\(?\\d{1,3}\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}',
    flags: 'g',
    testString: 'Call +1 (555) 123-4567 or 44-20-7946-0958',
  },
  {
    key: 'ipAddress',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: 'g',
    testString: 'Server IPs: 192.168.1.1, 10.0.0.1, 255.255.255.0',
  },
  {
    key: 'date',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    flags: 'g',
    testString: 'Dates: 2024-01-15, 2023-12-25, 2025-06-30',
  },
]

const FLAG_OPTIONS = ['g', 'i', 'm', 's', 'u'] as const

export function ToolPage() {
  const { t } = useTranslation()
  const [pattern, setPattern] = useState('')
  const [testString, setTestString] = useState('')
  const [flags, setFlags] = useState<Set<string>>(new Set(['g']))
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const hasTriggeredShare = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const toggleFlag = useCallback((flag: string) => {
    setFlags(prev => {
      const next = new Set(prev)
      if (next.has(flag)) {
        next.delete(flag)
      } else {
        next.add(flag)
      }
      return next
    })
  }, [])

  const flagString = useMemo(() => {
    return Array.from(flags).sort().join('')
  }, [flags])

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [] as MatchResult[], error: null }
    try {
      const regex = new RegExp(pattern, flagString)
      const results: MatchResult[] = []
      if (flagString.includes('g')) {
        let m: RegExpExecArray | null
        let safety = 0
        // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
        while ((m = regex.exec(testString)) !== null && safety < 10000) {
          safety++
          const groups: Record<string, string | undefined> = {}
          const numberedGroups: (string | undefined)[] = []
          if (m.groups) {
            for (const [key, val] of Object.entries(m.groups)) {
              groups[key] = val
            }
          }
          for (let i = 1; i < m.length; i++) {
            numberedGroups.push(m[i])
          }
          results.push({ index: m.index, match: m[0], groups, numberedGroups })
          if (m[0].length === 0) {
            regex.lastIndex++
          }
        }
      } else {
        const m = regex.exec(testString)
        if (m) {
          const groups: Record<string, string | undefined> = {}
          const numberedGroups: (string | undefined)[] = []
          if (m.groups) {
            for (const [key, val] of Object.entries(m.groups)) {
              groups[key] = val
            }
          }
          for (let i = 1; i < m.length; i++) {
            numberedGroups.push(m[i])
          }
          results.push({ index: m.index, match: m[0], groups, numberedGroups })
        }
      }
      return { matches: results, error: null }
    } catch (e) {
      return { matches: [] as MatchResult[], error: (e as Error).message }
    }
  }, [pattern, testString, flagString])

  // Trigger share modal on first successful match
  if (matches.length > 0 && !hasTriggeredShare.current && !isShareDismissed()) {
    hasTriggeredShare.current = true
    setTimeout(() => setShareOpen(true), 1500)
  }

  const handleCopy = useCallback(async () => {
    if (!pattern) return
    const fullRegex = `/${pattern}/${flagString}`
    try {
      await navigator.clipboard.writeText(fullRegex)
      setCopied(true)
      toast.success(t('tool.copiedToClipboard'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('tool.copyFailed'))
    }
  }, [pattern, flagString, t])

  const handleSelectPattern = useCallback(
    (p: (typeof COMMON_PATTERNS)[number]) => {
      setPattern(p.pattern)
      setTestString(p.testString)
      const newFlags = new Set<string>()
      for (const c of p.flags) {
        newFlags.add(c)
      }
      setFlags(newFlags)
      setShowDropdown(false)
    },
    []
  )

  return (
    <div className="space-y-8">
      <PageHeader />

      <div className="mx-auto max-w-4xl space-y-6 px-4">
        {/* Regex input row */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            {/* Pattern input */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="regex-pattern" className="font-medium text-foreground text-sm">
                  {t('tool.pattern')}
                </label>
                <div className="flex items-center gap-2">
                  {/* Common patterns dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDropdown(prev => !prev)}
                      className="gap-1.5"
                    >
                      {t('tool.commonPatterns')}
                      <ChevronDown className="size-3.5" />
                    </Button>
                    {showDropdown && (
                      <div className="absolute right-0 z-50 mt-1 min-w-48 rounded-md border bg-card p-1 shadow-lg">
                        {COMMON_PATTERNS.map(p => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => handleSelectPattern(p)}
                            className="w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          >
                            {t(`tool.${p.key}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Copy button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!pattern}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? t('tool.copied') : t('tool.copy')}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 focus-within:ring-2 focus-within:ring-ring" dir="ltr">
                <span className="select-none font-mono text-muted-foreground text-lg">/</span>
                <input
                  id="regex-pattern"
                  type="text"
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  placeholder={t('tool.patternPlaceholder')}
                  className="flex-1 bg-transparent py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground"
                  dir="ltr"
                  spellCheck={false}
                  autoComplete="off"
                />
                <span className="select-none font-mono text-muted-foreground text-lg">/</span>
                <span className="select-none font-mono text-sm text-orange-500">{flagString}</span>
              </div>
            </div>

            {/* Flags */}
            <div>
              <span className="mb-2 block font-medium text-foreground text-sm">
                {t('tool.flags')}
              </span>
              <div className="flex flex-wrap gap-2" dir="ltr">
                {FLAG_OPTIONS.map(flag => (
                  <button
                    key={flag}
                    type="button"
                    onClick={() => toggleFlag(flag)}
                    className={`rounded-md border px-3 py-1.5 font-mono text-sm transition-colors ${
                      flags.has(flag)
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm dark:border-red-900 dark:bg-red-950/50 dark:text-red-400" dir="ltr">
                {t('tool.invalidRegex')}: {error}
              </div>
            )}
          </div>
        </div>

        {/* Test string */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <label htmlFor="test-string" className="mb-2 block font-medium text-foreground text-sm">
            {t('tool.testString')}
          </label>
          <textarea
            id="test-string"
            value={testString}
            onChange={e => setTestString(e.target.value)}
            placeholder={t('tool.testStringPlaceholder')}
            rows={6}
            className="w-full rounded-lg border bg-background px-3 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            dir="ltr"
            spellCheck={false}
          />
        </div>

        {/* Match results */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-foreground text-lg">
            {t('tool.matches')}
          </h2>

          {pattern && !error && testString && matches.length === 0 && (
            <p className="text-muted-foreground text-sm">{t('tool.noMatches')}</p>
          )}

          {matches.length > 0 && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {t('tool.matchCount', { count: matches.length })}
              </p>
              <div className="space-y-2" dir="ltr">
                {matches.map((m, i) => (
                  <div
                    key={`${m.index}-${i}`}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="font-medium text-muted-foreground text-xs uppercase">
                        {t('tool.fullMatch')}
                      </span>
                      <code className="rounded bg-orange-100 px-2 py-0.5 font-mono text-orange-800 text-sm dark:bg-orange-900/30 dark:text-orange-300">
                        {m.match || '(empty string)'}
                      </code>
                      <span className="text-muted-foreground text-xs">
                        {t('tool.index')}: {m.index}
                      </span>
                    </div>
                    {/* Numbered groups */}
                    {m.numberedGroups.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="font-medium text-muted-foreground text-xs uppercase">
                          {t('tool.groups')}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {m.numberedGroups.map((g, gi) => (
                            <span
                              key={`g-${gi}`}
                              className="rounded border bg-muted px-2 py-0.5 font-mono text-xs"
                            >
                              ${gi + 1}: {g ?? 'undefined'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Named groups */}
                    {Object.keys(m.groups).length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="font-medium text-muted-foreground text-xs uppercase">
                          Named {t('tool.groups')}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(m.groups).map(([key, val]) => (
                            <span
                              key={key}
                              className="rounded border bg-muted px-2 py-0.5 font-mono text-xs"
                            >
                              {key}: {val ?? 'undefined'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!pattern && !testString && (
            <p className="text-muted-foreground text-sm">{t('tool.noMatches')}</p>
          )}
        </div>
      </div>

      <ShareModal open={shareOpen} onOpenChange={setShareOpen} showDismissOption />
    </div>
  )
}
