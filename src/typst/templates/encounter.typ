// Encounter Sheet template — GM-facing reference for Draw Steel
//
// Print mode (no background shading): --input print=true

#let _print = sys.inputs.at("print", default: "false") == "true"

// Colours
#let _ink        = rgb("#111827")
#let _header-bg  = rgb("#1e293b")
#let _header-fg  = white
#let _section-bg = if _print { white } else { rgb("#f1f5f9") }
#let _rule       = rgb("#cbd5e1")
#let _cost-fg    = rgb("#b91c1c")
#let _label-fg   = rgb("#334155")

// Section label bar
#let _section-label(t) = {
  v(0.6em)
  block(
    width: 100%,
    fill: _header-bg,
    inset: (x: 6pt, y: 4pt),
    radius: 2pt,
  )[
    #text(size: 7.5pt, weight: "bold", fill: _header-fg, tracking: 1.5pt)[#upper(t)]
  ]
  v(0.25em)
}

// Malice table
#let _malice-table(features) = {
  if features.len() == 0 { return }
  _section-label("Malice Features")
  table(
    columns: (auto, auto, 1fr),
    align: (center + horizon, left + horizon, left + horizon),
    stroke: (paint: _rule, thickness: 0.5pt),
    fill: (_, row) => if row == 0 { _section-bg } else { none },
    inset: (x: 6pt, y: 5pt),
    text(size: 8pt, weight: "bold", fill: _label-fg)[Cost],
    text(size: 8pt, weight: "bold", fill: _label-fg)[Name],
    text(size: 8pt, weight: "bold", fill: _label-fg)[Description],
    ..features.map(f => (
      text(size: 10pt, weight: "bold", fill: _cost-fg)[#f.cost],
      text(size: 9.5pt, weight: "bold")[#f.name],
      text(size: 9.5pt)[#f.description],
    )).flatten()
  )
}

// Roster table
#let _roster-table(groups) = {
  if groups.len() == 0 { return }
  _section-label("Encounter Roster")

  for g in groups {
    v(0.3em)
    stack(
      dir: ttb,
      block(
        width: 100%,
        fill: _section-bg,
        inset: (x: 6pt, y: 4pt),
        radius: (top: 2pt, bottom: 0pt),
      )[
        #text(size: 9pt, weight: "bold", fill: _label-fg)[#g.label]
      ],
      table(
        columns: (1fr, auto, auto, auto, auto, auto, 1.6fr),
        align: (left + horizon, center + horizon, center + horizon, center + horizon, center + horizon, center + horizon, left + horizon),
        stroke: (paint: _rule, thickness: 0.5pt),
        fill: (_, row) => if row == 0 { _section-bg } else { none },
        inset: (x: 5pt, y: 4pt),
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Name],
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Stamina],
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Stab],
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Speed],
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Free],
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Distance],
        text(size: 7.5pt, weight: "bold", fill: _label-fg)[Notes],
        ..g.creatures.map(c => (
          {
            text(size: 9.5pt, weight: "bold")[#c.name]
            let cnt = c.at("count", default: none)
            if cnt != none {
              h(4pt)
              text(size: 8.5pt, fill: rgb("#94a3b8"))[×#cnt]
            }
          },
          {
            text(size: 9.5pt, weight: "bold")[#c.stamina]
            text(size: 9pt)[\u{2F}]
            h(1pt)
            box(width: 1.6em, height: 0.9em, stroke: (bottom: 0.6pt + _rule))
          },
          text(size: 9.5pt)[#c.stability],
          text(size: 9.5pt)[#c.speed],
          text(size: 9.5pt)[#c.freeStrike],
          text(size: 9pt)[#c.distance],
          text(size: 9pt, fill: rgb("#475569"))[#c.notes],
        )).flatten()
      ),
    )
    v(0.4em)
  }
}

// Main template
#let encounter-sheet(
  encounter: "Unnamed Encounter",
  objective: "",
  victory: "",
  failure: "",
  malice: (),
  groups: (),
  body
) = {
  set document(title: encounter)

  set page(
    paper: "a4",
    margin: (x: 1.8cm, top: 1.6cm, bottom: 1.8cm),
    fill: white,
  )

  set text(size: 10pt, fill: _ink)
  set par(leading: 0.55em, spacing: 0.7em)

  // Title bar
  block(
    width: 100%,
    fill: _header-bg,
    inset: (x: 10pt, y: 8pt),
    radius: 3pt,
  )[
    #text(size: 16pt, weight: "bold", fill: _header-fg)[#encounter]
    #h(1fr)
    #text(size: 8pt, fill: rgb("#94a3b8"), tracking: 1pt)[ENCOUNTER SHEET]
  ]

  v(0.5em)

  // Objective
  _section-label("Encounter Objective")
  pad(x: 4pt)[#text(size: 10pt)[#objective]]

  v(0.5em)

  // Conditions
  _section-label("Encounter Conditions")
  pad(x: 4pt, grid(
    columns: (1fr, 1fr),
    column-gutter: 1em,
    stack(
      spacing: 0.3em,
      text(size: 8pt, weight: "bold", fill: rgb("#15803d"))[VICTORY],
      text(size: 9.5pt)[#victory],
    ),
    stack(
      spacing: 0.3em,
      text(size: 8pt, weight: "bold", fill: _cost-fg)[FAILURE],
      text(size: 9.5pt)[#failure],
    ),
  ))

  v(0.5em)

  _malice-table(malice)
  v(0.3em)
  _roster-table(groups)

  // Notes
  _section-label("Notes")
  pad(x: 4pt)[#body]
}
