// Handwritten note/letter template
// Usage: #import "../templates/handwritten.typ": *
//        #show: handwritten.with(title: "optional")
//
// Print mode (no background, black ink) is controlled via sys.inputs:
//   typst compile ... --input print=true

#let _print = sys.inputs.at("print", default: "false") == "true"

#let _parchment-bg() = {
  // Single SVG with a chained filter:
  //   1. Large-scale fractalNoise (low baseFreq) → organic aging blotches
  //   2. Fine fractalNoise (high baseFreq) → paper surface grain
  //   3. feBlend multiply combines them
  //   4. feColorMatrix maps the result to opaque parchment tones
  //
  // Color ranges after mapping (lightened/desaturated ~50% toward white):
  //   R: 0.13*noise + 0.83  →  0.83–0.96  (light cream)
  //   G: 0.10*noise + 0.78  →  0.78–0.88  (closer to R = less saturated)
  //   B: 0.05*noise + 0.70  →  0.70–0.75  (much warmer grey, not amber)
  //   A: 1                  →  fully opaque
  //
  // SVG uses viewBox so Typst can scale it to any page size.
  place(top + left,
    image.decode(
      ```xml
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 596 842" width="596" height="842"
           preserveAspectRatio="none">
        <defs>
          <filter id="parchment" x="0" y="0" width="100%" height="100%"
                  color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06"
                          numOctaves="6" seed="3" result="large"/>
            <feTurbulence type="fractalNoise" baseFrequency="0.55 0.50"
                          numOctaves="4" seed="11" result="fine"/>
            <feBlend in="large" in2="fine" mode="multiply" result="combined"/>
            <feColorMatrix in="combined" type="matrix"
              values="0.13 0 0 0 0.83
                      0.10 0 0 0 0.78
                      0.05 0 0 0 0.70
                      0    0 0 0 1"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#parchment)"/>
      </svg>
      ```.text,
      format: "svg",
      width: 100%,
      height: 100%,
    )
  )

  // Vignette — warm dark edges fading to transparent centre
  place(top + left, rect(
    width: 100%,
    height: 100%,
    fill: gradient.radial(
      rgb("#00000000"),
      rgb("#3a1a0070"),
      center: (50%, 50%),
      radius: 70%,
    ),
  ))
}

#let handwritten(
  title: none,
  body
) = {
  let ink-color = if _print { rgb("#000000") } else { rgb("#2c1810") }
  let paper-color = rgb("#f5e6c8")

  set document(title: if title != none { title } else { "Handout" })

  set page(
    paper: "a4",
    margin: (x: 2.5cm, y: 3cm),
    fill: if _print { white },
    background: if not _print { _parchment-bg() },
  )

  set text(
    font: "Caveat",
    size: 14pt,
    fill: ink-color,
    weight: "regular",
  )

  set par(
    leading: 1.2em,
    spacing: 1.6em,
  )

  if title != none {
    align(center)[
      #text(size: 22pt, weight: "bold")[#title]
      #v(0.5em)
    ]
  }

  body
}
