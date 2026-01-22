from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn
import cv2
import numpy as np
import io
from PIL import Image

app = FastAPI()

origins = [
    "*", # Allow all origins for production/development simplicity
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def read_imagefile(file) -> np.ndarray:
    image = Image.open(io.BytesIO(file))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

@app.get("/")
def read_root():
    return {"message": "Watermark Removal API is running"}

@app.post("/process-image")
async def process_image(
    image: UploadFile = File(...),
    mask: UploadFile = File(...)
):
    # Read files
    img_bytes = await image.read()
    mask_bytes = await mask.read()

    # Convert to OpenCV format
    img = read_imagefile(img_bytes)
    mask_img = read_imagefile(mask_bytes)

    # Ensure mask is grayscale and same size
    if img.shape[:2] != mask_img.shape[:2]:
        mask_img = cv2.resize(mask_img, (img.shape[1], img.shape[0]))
    
    if len(mask_img.shape) == 3:
        mask_gray = cv2.cvtColor(mask_img, cv2.COLOR_BGR2GRAY)
    else:
        mask_gray = mask_img

    # Threshold mask to ensure binary (0 or 255)
    _, mask_binary = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)

    # Inpaint using Telea algorithm (fast and decent for simple cases)
    # Radius = 3
    result = cv2.inpaint(img, mask_binary, 3, cv2.INPAINT_TELEA)

    # Encode back to PNG for response
    _, encoded_img = cv2.imencode('.png', result)
    return Response(content=encoded_img.tobytes(), media_type="image/png")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
