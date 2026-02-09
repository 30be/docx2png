import { useState, useRef } from "react"
import { Loader2, Download, AlertCircle } from "lucide-react"

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError(null)
      setDownloadUrl(null)
    }
  }

  const handleConvert = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setDownloadUrl(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/convert", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Conversion failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-[400px] rounded-lg border bg-white text-slate-950 shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">DOCX to PNG Converter</h3>
          <p className="text-sm text-slate-500">Upload a DOCX file to convert it to PNG images.</p>
        </div>
        <div className="p-6 pt-0 space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <input
              ref={fileInputRef}
              id="docx-file"
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              disabled={loading}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-900 text-sm p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {downloadUrl && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Conversion complete!</span>
            </div>
          )}
        </div>
        <div className="flex items-center p-6 pt-0 justify-between">
          <button
            onClick={() => {
              setFile(null)
              setDownloadUrl(null)
              setError(null)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
            disabled={loading || (!file && !downloadUrl)}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-10 px-4 py-2"
          >
            Clear
          </button>
          
          {downloadUrl ? (
            <a href={downloadUrl} download={`${file?.name.replace(".docx", "")}_images.zip`}>
              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-4 py-2">
                Download ZIP
              </button>
            </a>
          ) : (
            <button
              onClick={handleConvert}
              disabled={!file || loading}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-slate-50 hover:bg-slate-900/90 h-10 px-4 py-2"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Converting..." : "Convert"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App