// Monster Card template — GM reference cards for Draw Steel
// Prints 3 landscape 3x5 index card slots per 8.5x11 portrait sheet.
// Content is rotated so cards read in PORTRAIT after punching out.
// Abilities and traits overflow to a back card automatically.
//
// Double-sided (flip on long edge):
//   Front page: content rotated -90 deg (header at left of landscape slot)
//   Back page:  content rotated +90 deg (header at right — corrects for long-edge flip)

#let _print = sys.inputs.at("print", default: "false") == "true"

// Dimensions
#let _cw  = 5in    // card slot width  (landscape, on page)
#let _ch  = 3in    // card slot height (landscape, on page)
#let _pw  = _ch    // portrait card content width  = 3in
#let _ph  = _cw    // portrait card content height = 5in
#let _gap = 0.5in  // gap between card slots on the page

#let _tier-box-w = 28pt

// Colors
#let _ink     = rgb("#111827")
#let _hdr-bg  = rgb("#1e293b")
#let _hdr-fg  = white
#let _sub-bg  = if _print { white } else { rgb("#f1f5f9") }
#let _rule    = rgb("#cbd5e1")
#let _lbl     = rgb("#475569")
#let _tier-bg = if _print { rgb("#ebebeb") } else { rgb("#e2e8f0") }
#let _type-fg = rgb("#92400e")

// Helpers

#let _sign(n) = {
  if n > 0      { "+" + str(n) }
  else if n < 0 { "\u{2212}" + str(-n) }
  else          { "0" }
}

// Ability block (feature_type == "ability")

#let _ability(ab) = {
  let name       = ab.name
  let type_      = ab.at("ability_type", default: none)
  let usage      = ab.at("usage",        default: none)
  let kw         = ab.at("keywords",     default: none)
  let dist       = ab.at("distance",     default: none)
  let tgt        = ab.at("target",       default: none)
  let trigger    = ab.at("trigger",      default: none)
  let cost       = ab.at("cost",         default: none)
  let effects    = ab.at("effects",      default: ())

  // Find power roll effect (has "roll" key)
  let pr = effects.filter(e => "roll" in e.keys())
  let named = effects.filter(e => "roll" not in e.keys() and "effect" in e.keys())

  block(above: 5pt, below: 0pt, width: 100%)[
    #grid(columns: (1fr, auto), inset: 0pt, column-gutter: 4pt,
      {
        text(size: 7.5pt, weight: "bold")[#name]
        if cost != none { text(size: 6.5pt, fill: _type-fg)[ (#cost Malice)] }
      },
      if type_ != none {
        text(size: 6.5pt, weight: "bold", fill: _type-fg)[#type_]
      } else { [] },
    )
    #if kw != none or usage != none [
      #grid(columns: (1fr, auto), inset: 0pt, column-gutter: 4pt,
        if kw    != none { text(size: 6.5pt, fill: _lbl)[#kw.join(", ")] } else { [] },
        if usage != none { text(size: 6.5pt, fill: _lbl)[#usage]         } else { [] },
      )
    ]
    #if dist != none or tgt != none [
      #grid(columns: (1fr, auto), inset: 0pt, column-gutter: 4pt,
        if dist != none { text(size: 6.5pt, fill: _lbl)[→ #dist] } else { [] },
        if tgt  != none { text(size: 6.5pt, fill: _lbl)[#tgt]    } else { [] },
      )
    ]
    #if trigger != none [
      #text(size: 6.5pt)[#text(weight: "bold")[Trigger:] #trigger]
    ]
    #if pr.len() > 0 {
      let p = pr.first()
      v(5pt)
      // Tier rows
      for (tier-label, tier-key) in (("\u{2264}11", "tier1"), ("12-16", "tier2"), ("17+", "tier3")) {
        let result = p.at(tier-key, default: none)
        if result != none {
          block(above: 0pt, below: 5pt, width: 100%)[
            #grid(
              columns: (_tier-box-w, 1fr),
              column-gutter: 5pt,
              align: horizon,
              box(
                fill: _tier-bg,
                stroke: (paint: _rule, thickness: 0.4pt),
                inset: (x: 3pt, y: 3pt),
                radius: 2pt,
                width: _tier-box-w,
              )[#align(center)[#text(size: 6pt, weight: "bold")[#tier-label]]],
              text(size: 6pt)[#result],
            )
          ]
        }
      }
      v(4pt)
    }
    #for eff in named [
      #text(size: 6.5pt)[
        #if eff.at("name", default: none) != none [#text(weight: "bold")[#eff.name:] ]
        #if eff.at("cost", default: none) != none [#text(fill: _type-fg)[(#eff.cost Malice)] ]
        #eff.effect
      ]
    ]
    #v(3pt)
    #line(length: 100%, stroke: (paint: _rule, thickness: 0.5pt))
  ]
}

// Trait block (feature_type == "trait")

#let _trait(tr) = block(above: 5pt, below: 0pt, width: 100%)[
  #text(size: 7.5pt, weight: "bold")[#box(baseline: -1pt)[\u{2605}] #tr.name]
  #for eff in tr.at("effects", default: ()) [
    #if "effect" in eff.keys() [
      #text(size: 7pt)[ \u{2014} #eff.effect]
    ]
  ]
  #v(3pt)
  #line(length: 100%, stroke: (paint: _rule, thickness: 0.5pt))
]

// Render a feature (dispatches by feature_type)

#let _render-feature(feat) = {
  if feat.feature_type == "trait" { _trait(feat) } else { _ability(feat) }
}

// Render a list of features

#let _render-features(features) = {
  for feat in features { _render-feature(feat) }
}

// Header renderer

#let _render-header(m, full: true) = {
  let immune = m.at("immunities", default: none)
  let weak   = m.at("weaknesses", default: none)
  let move   = m.at("movement",   default: none)

  // Name + Level/Role bar
  block(width: 100%, fill: _hdr-bg, inset: (x: 7pt, y: 5pt), spacing: 0pt)[
    #text(size: 10pt, weight: "bold", fill: _hdr-fg)[#m.name]
    #h(1fr)
    #text(size: 7pt, fill: rgb("#94a3b8"))[Level #m.level #m.roles.join(", ")]
  ]

  if full [
    // Ancestry + EV subtitle
    #block(width: 100%, fill: _sub-bg, inset: (x: 7pt, y: 2pt), spacing: 0pt)[
      #text(size: 7pt, fill: _lbl)[#m.ancestry.join(", ")]
      #h(1fr)
      #{ let ev = m.at("ev", default: none); if ev != none { text(size: 7pt, fill: _lbl)[EV #ev] } }
    ]
    // Stats table
    #block(spacing: 0pt, width: 100%)[
      #table(
        columns: (1fr, 1fr, 1.3fr, 1.1fr, 0.8fr),
        align: center + horizon,
        inset: (x: 4pt, y: 3pt),
        stroke: (paint: _rule, thickness: 0.5pt),
        fill: _sub-bg,
        text(size: 9pt, weight: "bold")[#m.size],
        text(size: 9pt, weight: "bold")[#m.speed],
        text(size: 9pt, weight: "bold")[#m.stamina],
        text(size: 9pt, weight: "bold")[#m.stability],
        text(size: 9pt, weight: "bold")[#m.free_strike],
        text(size: 6pt, fill: _lbl)[Size],
        text(size: 6pt, fill: _lbl)[Spd],
        text(size: 6pt, fill: _lbl)[Stam],
        text(size: 6pt, fill: _lbl)[Stab],
        text(size: 6pt, fill: _lbl)[FS],
      )
    ]
    // Immunity / Weakness / Movement
    #if immune != none or weak != none or (move != none and move != "") [
      #block(spacing: 0pt, width: 100%)[
        #pad(x: 7pt, top: 3pt, bottom: 2pt)[
          #text(size: 7pt)[
            #if immune != none [*Immune:* #immune.join(", ")#h(6pt)]
            #if weak   != none [*Weak:* #weak.join(", ")]
          ]
          #if move != none and move != "" [
            #v(1pt)
            #text(size: 7pt)[*Move:* #move]
          ]
        ]
      ]
    ]
    // Characteristics bar
    #block(width: 100%, fill: _hdr-bg, inset: (x: 7pt, y: 4pt), spacing: 0pt)[
      #let _chars = (
        (lbl: "M", key: "might"),   (lbl: "A", key: "agility"),
        (lbl: "R", key: "reason"),  (lbl: "I", key: "intuition"),
        (lbl: "P", key: "presence"),
      )
      #grid(
        columns: (1fr, 1fr, 1fr, 1fr, 1fr),
        align: center,
        .._chars.map(c => text(size: 7.5pt, fill: _hdr-fg)[
          #text(weight: "bold")[#c.lbl] #_sign(m.at(c.key, default: 0))
        ])
      )
    ]
  ]
}

// Paginate features into card-sized pages.
// Returns an array of feature arrays, one per card side.
// The first page uses the full header; subsequent pages use the compact header.

// Measure the total height of a card side (header + padded features)
// exactly as it would render, so spacing is accurate.
#let _measure-card(m, features, full-header) = {
  measure(block(width: _pw, above: 0pt, below: 0pt, spacing: 0pt)[
    #set text(size: 10pt, fill: _ink)
    #set par(leading: 0.4em, spacing: 0.5em)
    #_render-header(m, full: full-header)
    #pad(x: 7pt, top: 4pt, bottom: 4pt)[
      #_render-features(features)
    ]
  ]).height
}

#let _paginate(m) = {
  let all-features = m.at("features", default: ())

  let pages = ()
  let current-page = ()
  let is-first = true

  for feat in all-features {
    let candidate = current-page + (feat,)
    let h = _measure-card(m, candidate, is-first)

    if h > _ph and current-page.len() > 0 {
      // Overflow: start a new page
      pages.push(current-page)
      current-page = (feat,)
      is-first = false
    } else {
      current-page = candidate
    }
  }
  if current-page.len() > 0 {
    pages.push(current-page)
  }

  pages
}

// Render a single card side

#let _card-side(m, features, full-header: false, flipped: false) = {
  let inner = block(
    above: 0pt, below: 0pt,
    width: _pw, height: _ph,
    clip: true,
    stroke: (paint: _rule, thickness: 0.5pt),
    radius: 3pt,
  )[
    #_render-header(m, full: full-header)
    #pad(x: 7pt, top: 4pt, bottom: 4pt)[
      #_render-features(features)
    ]
  ]
  if flipped { rotate(180deg, reflow: true, inner) } else { inner }
}

// Render an empty card side (blank placeholder)

#let _card-blank() = {
  block(
    above: 0pt, below: 0pt,
    width: _pw, height: _ph,
    stroke: (paint: _rule, thickness: 0.5pt),
    radius: 3pt,
  )[]
}

// Main template
//
// Each monster produces a series of card sides (front page 1, then continuation
// pages). We pair sides into front/back for double-sided printing: odd sides
// are fronts, even sides are backs. Monsters are laid out 3 card slots per
// sheet; a monster that needs more than 2 sides simply occupies extra slots.

#let monster-card-sheet(
  title: "Monster Cards",
  monsters: (),
  body,
) = context {
  set document(title: title)
  set page(
    paper: "us-letter",
    flipped: true,
    margin: (x: 0.5in, top: 1.75in, bottom: 1.75in),
    fill: white,
  )
  set text(size: 10pt, fill: _ink)
  set par(leading: 0.4em, spacing: 0.5em)

  if monsters.len() == 0 {
    align(center + horizon, text(size: 14pt, fill: _lbl)[
      Select monsters to generate cards
    ])
  } else {

  // Build a flat list of card sides: (monster, features, full-header?)
  // Each monster gets ceil(pages/2)*2 sides (padded to even for front/back pairing).
  let sides = ()
  for m in monsters {
    let pages = _paginate(m)
    if pages.len() == 0 { pages = ((),) }

    // First side always has full header
    sides.push((m: m, features: pages.at(0), full: true))

    // Remaining pages get compact header
    for pi in range(1, pages.len()) {
      sides.push((m: m, features: pages.at(pi), full: false))
    }

    // Pad to even number of sides so the back page lines up
    if calc.rem(pages.len(), 2) != 0 {
      sides.push(none)  // blank back
    }
  }

  // Group sides into pairs (front, back)
  let pairs = ()
  let pi = 0
  while pi < sides.len() {
    let front = sides.at(pi)
    let back  = if pi + 1 < sides.len() { sides.at(pi + 1) } else { none }
    pairs.push((front: front, back: back))
    pi += 2
  }

  // Layout 3 card slots per sheet
  let slots = ()
  let si = 0
  while si < pairs.len() {
    slots.push(pairs.slice(si, calc.min(si + 3, pairs.len())))
    si += 3
  }

  for (gi, group) in slots.enumerate() {
    if gi > 0 { pagebreak() }

    // Front page
    stack(dir: ltr, spacing: _gap,
      ..group.map(pair => {
        let s = pair.front
        if s == none { _card-blank() }
        else { _card-side(s.m, s.features, full-header: s.full) }
      })
    )

    // Back page
    pagebreak()
    stack(dir: ltr, spacing: _gap,
      ..group.map(pair => {
        let s = pair.back
        if s == none { _card-blank() }
        else { _card-side(s.m, s.features, full-header: s.full, flipped: true) }
      })
    )
  }
  }
}
