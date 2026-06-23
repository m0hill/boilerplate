export const request = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://test.local${path}`, init)

export const datastarPost = (path: string, signals: unknown = {}): Request =>
  request(path, {
    method: "POST",
    headers: { "datastar-request": "true" },
    body: JSON.stringify(signals),
  })
