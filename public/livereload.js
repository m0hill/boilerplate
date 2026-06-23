;(() => {
  let booted = null
  const connect = () => {
    const es = new EventSource("/__livereload")
    es.addEventListener("boot", (event) => {
      if (booted === null) booted = event.data
      else if (event.data !== booted) location.reload()
    })
    es.addEventListener("reload", () => location.reload())
    es.onerror = () => {
      es.close()
      setTimeout(connect, 500)
    }
  }
  connect()
})()
