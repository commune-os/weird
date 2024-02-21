import Document from '../layouts/document.js'

export const handler = context => {
  const { res } = context

  return (
    <HttpResponse
      res={res}
      status={404}
    >
      <Document>
        <h1>404</h1>
        <p>Page not found</p>
      </Document>
    </HttpResponse>
  )
}
