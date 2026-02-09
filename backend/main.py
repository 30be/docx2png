import os
import shutil
import uuid
import subprocess
import zipfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Allow CORS for local dev (though same origin now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define API routes first
def cleanup_temp_dir(temp_dir: Path):
    if temp_dir.exists():
        shutil.rmtree(temp_dir)

@app.post("/convert")
def convert_docx_to_png(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # Create a unique temp directory
    request_id = str(uuid.uuid4())
    temp_dir = Path(f"/tmp/docx2png_{request_id}")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    # Unique LibreOffice profile to allow parallel instances
    lo_profile = temp_dir / "lo_profile"
    lo_profile.mkdir()

    try:
        # Save uploaded file
        input_path = temp_dir / file.filename
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Convert DOCX to PDF
        # Use -env:UserInstallation to avoid "User profile is locked" during parallel execution
        cmd_libreoffice = [
            "libreoffice",
            f"-env:UserInstallation=file://{lo_profile}",
            "--headless",
            "--convert-to",
            "pdf",
            str(input_path),
            "--outdir",
            str(temp_dir)
        ]
        
        result_lo = subprocess.run(cmd_libreoffice, capture_output=True, text=True)
        if result_lo.returncode != 0:
            raise Exception(f"LibreOffice conversion failed: {result_lo.stderr}")

        # Identify the generated PDF
        pdf_filename = input_path.stem + ".pdf"
        pdf_path = temp_dir / pdf_filename
        
        if not pdf_path.exists():
             pdfs = list(temp_dir.glob("*.pdf"))
             if len(pdfs) == 1:
                 pdf_path = pdfs[0]
             else:
                 raise Exception(f"PDF file was not created or ambiguous: {pdf_path}")

        # Convert PDF to PNGs
        output_prefix = "page"
        cmd_pdftoppm = [
            "pdftoppm",
            str(pdf_path),
            str(temp_dir / output_prefix),
            "-png"
        ]
        
        result_ppm = subprocess.run(cmd_pdftoppm, capture_output=True, text=True)
        if result_ppm.returncode != 0:
            raise Exception(f"pdftoppm conversion failed: {result_ppm.stderr}")

        # Zip the PNGs
        zip_filename = f"{input_path.stem}_images.zip"
        zip_path = temp_dir / zip_filename
        
        png_files = sorted(list(temp_dir.glob("*.png")))
        if not png_files:
             raise Exception("No PNG images were generated.")

        with zipfile.ZipFile(zip_path, "w") as zipf:
            for png in png_files:
                zipf.write(png, arcname=png.name)

        # Return the zip file
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type="application/zip"
        )

    except Exception as e:
        # Cleanup on error
        cleanup_temp_dir(temp_dir)
        return JSONResponse(status_code=500, content={"error": str(e)})

# Mount static files
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    
    @app.get("/")
    async def read_index():
        return FileResponse(frontend_dist / "index.html")
    
    # Serve other static files like vite.svg if they exist
    @app.get("/{path:path}")
    async def serve_static(path: str):
        file_path = frontend_dist / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return JSONResponse(status_code=404, content={"error": "Not found"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
