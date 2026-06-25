import { encode } from "uqr"

const QUIET_ZONE = 2

class QrCode extends HTMLElement {
  static readonly observedAttributes = ["text"]

  readonly #canvas = document.createElement("canvas")

  connectedCallback(): void {
    this.#canvas.style.display = "block"
    this.#canvas.style.width = "100%"
    this.#canvas.style.height = "100%"
    if (!this.#canvas.isConnected) this.append(this.#canvas)
    this.#render()
  }

  attributeChangedCallback(): void {
    this.#render()
  }

  #render(): void {
    const context = this.#canvas.getContext("2d")
    if (context === null) return

    const text = (this.getAttribute("text") ?? "").trim()
    const cssSize = this.clientWidth || 240
    const dpr = window.devicePixelRatio || 1
    const pixelSize = Math.round(cssSize * dpr)

    this.#canvas.width = pixelSize
    this.#canvas.height = pixelSize

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, pixelSize, pixelSize)
    if (text === "") return

    const { size, data } = encode(text, { border: 0, ecc: "M" })
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
}

customElements.define("qr-code", QrCode)
