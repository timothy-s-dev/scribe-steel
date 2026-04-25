// Lore Book handout template
// Presents an in-character executive summary of a fictional text.
//
// Usage:
//   #import "../templates/lorebook.typ": *
//   #show: lorebook.with(
//     title: "Lore of the Demon Court",
//     category: "Chaos Lorebook",           // optional
//     epigraph: "In the beginning...",      // optional in-character quote
//     epigraphAttribution: "— The Author", // optional
//     description: [                        // optional physical/reading framing
//       This slim volume, bound in cracked leather...
//     ],
//   )
//
//   // Body uses = Section Header = for bold section heads, and normal prose.
//   // Add a fleuron divider between sections with: #divider
//
// Print mode (white bg, black ink): --input print=true

#let _print = sys.inputs.at("print", default: "false") == "true"

// Horizontal fleuron divider — use between body sections
#let divider = align(center)[
  #v(0.3em)
  #text(size: 11pt, fill: rgb("#555555"))[❧]
  #v(0.3em)
]

// Double-rule page border drawn in the background
#let _border(ink) = {
  let outer = 0.5pt
  let inner = 0.3pt
  let gap = 4pt
  let m = 14pt  // distance from page edge

  // Outer rule
  place(top + left, dx: m, dy: m, rect(
    width: 100% - 2 * m,
    height: 100% - 2 * m,
    stroke: (paint: ink, thickness: outer),
    fill: none,
  ))
  // Inner rule
  place(top + left, dx: m + gap, dy: m + gap, rect(
    width: 100% - 2 * (m + gap),
    height: 100% - 2 * (m + gap),
    stroke: (paint: ink, thickness: inner),
    fill: none,
  ))
}

#let lorebook(
  title: "",
  category: none,
  epigraph: none,
  epigraphAttribution: none,
  description: none,
  body
) = {
  let ink = if _print { rgb("#000000") } else { rgb("#1a1008") }
  let bg  = if _print { white } else { rgb("#f2ead8") }
  let rule-color = if _print { rgb("#333333") } else { rgb("#3a2a10") }

  set document(title: title)

  set page(
    paper: "a4",
    margin: (x: 2.8cm, top: 2cm, bottom: 2cm),
    fill: bg,
    background: _border(rule-color),
  )

  set text(
    font: "EB Garamond",
    size: 11pt,
    fill: ink,
    weight: "regular",
  )

  set par(
    leading: 0.65em,
    spacing: 0.9em,
    justify: true,
  )

  // Section headers: = Title =  → bold, non-all-caps, with rule beneath
  show heading.where(level: 1): it => {
    v(0.6em)
    smallcaps(text(weight: "bold", size: 13pt)[#it.body])
    v(-0.5em)
    line(length: 100%, stroke: (paint: rule-color, thickness: 0.4pt))
    v(0.3em)
  }

  // ── Title block ──────────────────────────────────────────────────────────
  align(center)[
    #v(0.5em)
    #smallcaps(text(size: 17pt, weight: "bold")[#title])
    #if category != none {
      linebreak()
      smallcaps(text(size: 9pt, style: "normal", weight: "regular")[#category])
    }
    #v(0.4em)
    #line(length: 80%, stroke: (paint: rule-color, thickness: 0.5pt))
  ]

  // ── Epigraph ─────────────────────────────────────────────────────────────
  if epigraph != none {
    v(0.6em)
    align(center)[
      #block(width: 80%)[
        #set text(style: "italic", size: 10.5pt)
        #set par(justify: false, leading: 0.7em)
        #epigraph
        #if epigraphAttribution != none {
          linebreak()
          text(style: "normal", size: 9.5pt)[#epigraphAttribution]
        }
      ]
    ]
    v(0.4em)
    align(center)[
      #line(length: 40%, stroke: (paint: rule-color, thickness: 0.3pt))
    ]
    v(0.4em)
  }

  // ── Physical description / reading-experience framing ────────────────────
  if description != none {
    set text(style: "italic", size: 10.5pt)
    description
    v(0.2em)
  }

  // ── Body ─────────────────────────────────────────────────────────────────
  body
}
