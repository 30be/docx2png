import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
      const response = await fetch("http://localhost:8000/convert", {
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
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>DOCX to PNG Converter</CardTitle>
          <CardDescription>Upload a DOCX file to convert it to PNG images.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input
              ref={fileInputRef}
              id="docx-file"
              type="file"
              accept=".docx"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
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
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => {
            setFile(null)
            setDownloadUrl(null)
            setError(null)
            if (fileInputRef.current) fileInputRef.current.value = ""
          }} disabled={loading || (!file && !downloadUrl)}>
            Clear
          </Button>
          
          {downloadUrl ? (
            <a href={downloadUrl} download={`${file?.name.replace(".docx", "")}_images.zip`}>
              <Button>Download ZIP</Button>
            </a>
          ) : (
            <Button onClick={handleConvert} disabled={!file || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Converting..." : "Convert"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default App