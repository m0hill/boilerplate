import { encode } from "uqr"

// Client island: a live QR-code generator.
//
// This is the kind of work that does not belong on the server in a hypermedia
// app — there is no round trip to make. The browser owns a text input and a
// <canvas>, encodes the text with a real library (uqr), and paints the matrix
// itself, crisply, at the device pixel ratio. Datastar drives server state;
// islands like this own self-contained, browser-only behavior.

const QUIET_ZONE = 2 // modules of white border around the code

const input = document.querySelector<HTMLInputElement>("#qr-input")
const canvas = document.querySelector<HTMLCanvasElement>("#qr-canvas")
const context = canvas?.getContext("2d") ?? null

const render = (text: string): void => {
  if (canvas === null || context === null) return

  const value = text.trim()
  const cssSize = canvas.clientWidth || 240
  const dpr = window.devicePixelRatio || 1
  const pixelSize = Math.round(cssSize * dpr)

  canvas.width = pixelSize
  canvas.height = pixelSize
  canvas.style.height = `${cssSize}px`

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, pixelSize, pixelSize)
  if (value === "") return

  const { size, data } = encode(value, { border: 0, ecc: "M" })
  const modules = size + QUIET_ZONE * 2
  const scale = pixelSize / modules

  context.fillStyle = "#000000"
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!data[row]?.[col]) continue
      const x = Math.floor((col + QUIET_ZONE) * scale)
      const y = Math.floor((row + QUIET_ZONE) * scale)
      const end = Math.ceil(scale)
      context.fillRect(x, y, end, end)
    }
  }
}

if (input !== null && canvas !== null) {
  input.addEventListener("input", () => render(input.value))
  window.addEventListener("resize", () => render(input.value))
  render(input.value)
}
