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

// Ability block

#let _ability(ab) = {
  let name   = ab.name
  let damage = ab.at("damage",    default: none)
  let type_  = ab.at("type",      default: none)
  let action = ab.at("action",    default: none)
  let kw     = ab.at("keywords",  default: none)
  let dist   = ab.at("distance",  default: none)
  let tgt    = ab.at("target",    default: none)
  let pr     = ab.at("powerRoll", default: none)
  let effect = ab.at("effect",    default: none)

  block(above: 5pt, below: 0pt, width: 100%)[
    #grid(columns: (1fr, auto), inset: 0pt, column-gutter: 4pt,
      {
        text(size: 7.5pt, weight: "bold")[#name]
        if damage != none { text(size: 7.5pt)[ #damage] }
      },
      if type_ != none {
        text(size: 6.5pt, weight: "bold", fill: _type-fg)[#type_]
      } else { [] },
    )
    #if kw != none or action != none [
      #grid(columns: (1fr, auto), inset: 0pt, column-gutter: 4pt,
        if kw     != none { text(size: 6.5pt, fill: _lbl)[#kw.join(", ")] } else { [] },
        if action != none { text(size: 6.5pt, fill: _lbl)[#action]        } else { [] },
      )
    ]
    #if dist != none or tgt != none [
      #grid(columns: (1fr, auto), inset: 0pt, column-gutter: 4pt,
        if dist != none { text(size: 6.5pt, fill: _lbl)[→ #dist] } else { [] },
        if tgt  != none { text(size: 6.5pt, fill: _lbl)[#tgt]    } else { [] },
      )
    ]
    #if pr != none {
      v(5pt)
      for t in pr {
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
            )[#align(center)[#text(size: 6pt, weight: "bold")[#t.tier]]],
            text(size: 6pt)[#t.result],
          )
        ]
      }
      v(4pt)
    }
    #if effect != none {
      text(size: 6.5pt)[#text(weight: "bold")[Effect:] #effect]
    }
    #v(3pt)
    #line(length: 100%, stroke: (paint: _rule, thickness: 0.5pt))
  ]
}

// Trait block

#let _trait(tr) = block(above: 5pt, below: 0pt, width: 100%)[
  #text(size: 7.5pt, weight: "bold")[\u{2605} #tr.name]
  #text(size: 7pt)[ \u{2014} #tr.description]
  #v(3pt)
  #line(length: 100%, stroke: (paint: _rule, thickness: 0.5pt))
]

// Render a mixed list of abilities and traits

#let _render-items(items) = {
  for item in items {
    if "description" in item.keys() { _trait(item) } else { _ability(item) }
  }
}

// Header renderer

#let _render-header(m, full: true) = {
  let chars  = m.at("characteristics", default: (:))
  let immune = m.at("immunity",  default: none)
  let weak   = m.at("weakness",  default: none)
  let move   = m.at("movement",  default: none)

  // Name + Level/Role bar
  block(width: 100%, fill: _hdr-bg, inset: (x: 7pt, y: 5pt), spacing: 0pt)[
    #text(size: 10pt, weight: "bold", fill: _hdr-fg)[#m.name]
    #h(1fr)
    #text(size: 7pt, fill: rgb("#94a3b8"))[Level #m.level #m.role]
  ]

  if full [
    // Keywords + EV subtitle
    #block(width: 100%, fill: _sub-bg, inset: (x: 7pt, y: 2pt), spacing: 0pt)[
      #text(size: 7pt, fill: _lbl)[#m.at("keywords", default: ()).join(", ")]
      #h(1fr)
      #text(size: 7pt, fill: _lbl)[EV #m.ev]
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
        text(size: 9pt, weight: "bold")[#m.at("freeStrike")],
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
            #if immune != none [*Immune:* #immune#h(6pt)]
            #if weak   != none [*Weak:* #weak]
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
          #text(weight: "bold")[#c.lbl] #_sign(chars.at(c.key, default: 0))
        ])
      )
    ]
  ]
}

// Auto-split: front vs back items

#let _do-split(m) = {
  let all-items = m.at("abilities", default: ()) + m.at("traits", default: ())

  let header-h  = measure(block(width: _pw)[#_render-header(m, full: true)]).height
  let content-w = _pw - 14pt
  let available = _ph - header-h - 8pt

  let front      = ()
  let back       = ()
  let used       = 0pt
  let overflowed = false

  for item in all-items {
    if overflowed { back.push(item); continue }
    let h = measure(
      block(width: content-w)[
        #if "description" in item.keys() { _trait(item) } else { _ability(item) }
      ]
    ).height + 5pt
    if used + h <= available {
      front.push(item)
      used += h
    } else {
      overflowed = true
      back.push(item)
    }
  }

  (front: front, back: back)
}

// Portrait card content

#let _portrait-front(m) = context {
  let split = _do-split(m)
  block(
    above: 0pt, below: 0pt,
    width: _pw, height: _ph,
    clip: true,
    stroke: (paint: _rule, thickness: 0.5pt),
    radius: 3pt,
  )[
    #_render-header(m, full: true)
    #pad(x: 7pt, top: 4pt, bottom: 4pt)[
      #_render-items(split.front)
    ]
  ]
}

#let _portrait-back(m) = context {
  let split = _do-split(m)
  block(
    above: 0pt, below: 0pt,
    width: _pw, height: _ph,
    clip: true,
    stroke: (paint: _rule, thickness: 0.5pt),
    radius: 3pt,
  )[
    #if split.back.len() > 0 [
      #_render-header(m, full: false)
      #pad(x: 7pt, top: 4pt, bottom: 4pt)[
        #_render-items(split.back)
      ]
    ]
  ]
}

// Rotated card wrappers

#let _front(m) = _portrait-front(m)
#let _back(m)  = rotate(180deg, reflow: true, _portrait-back(m))

// Main template

#let monster-card-sheet(
  monsters: (),
  body,
) = {
  set document(title: "Monster Cards")
  set page(
    paper: "us-letter",
    flipped: true,
    margin: (x: 0.5in, top: 1.75in, bottom: 1.75in),
    fill: white,
  )
  set text(size: 10pt, fill: _ink)
  set par(leading: 0.4em, spacing: 0.5em)

  let groups = ()
  let i = 0
  while i < monsters.len() {
    groups.push(monsters.slice(i, calc.min(i + 3, monsters.len())))
    i += 3
  }

  for (gi, group) in groups.enumerate() {
    if gi > 0 { pagebreak() }

    // Front page
    stack(dir: ltr, spacing: _gap, ..group.map(_front))

    // Back page (always generated for correct double-sided printing)
    pagebreak()
    stack(dir: ltr, spacing: _gap, ..group.map(_back))
  }
}
