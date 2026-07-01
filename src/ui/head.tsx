import { DATASTAR_RUNTIME } from "@/lib/constants"

const navigationPrefetchRules = JSON.stringify({
  prefetch: [
    {
      source: "document",
      where: {
        and: [
          { href_matches: "/*" },
          { selector_matches: "a[data-nav-prefetch]:not([target='_blank']):not([download])" },
        ],
      },
      eagerness: "moderate",
    },
  ],
})

export const pageHead = () => [
  <link
    rel="stylesheet"
    href="/app.css"
  />,
  <script type="speculationrules">{navigationPrefetchRules}</script>,
  <script
    type="module"
    src={DATASTAR_RUNTIME}
  />,
]
