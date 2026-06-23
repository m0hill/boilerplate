const el = document.getElementById("clock")

if (el) {
  const tick = (): void => {
    el.textContent = new Date().toLocaleTimeString()
  }
  tick()
  setInterval(tick, 1000)
}
