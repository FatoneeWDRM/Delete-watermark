import requests
import cv2
import numpy as np
import io

def create_dummy_data():
    # Create white image
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    # Draw a black circle (watermark)
    cv2.circle(img, (50, 50), 10, (0, 0, 0), -1)
    
    # Create mask (white circle on black background)
    mask = np.zeros((100, 100), dtype=np.uint8)
    cv2.circle(mask, (50, 50), 10, 255, -1)
    
    # Encode
    _, img_enc = cv2.imencode('.png', img)
    _, mask_enc = cv2.imencode('.png', mask)
    
    return io.BytesIO(img_enc.tobytes()), io.BytesIO(mask_enc.tobytes())

def test_process_image():
    img_io, mask_io = create_dummy_data()
    
    files = {
        'image': ('test.png', img_io, 'image/png'),
        'mask': ('mask.png', mask_io, 'image/png')
    }
    
    try:
        response = requests.post('http://localhost:8000/process-image', files=files)
        if response.status_code == 200:
            print("SUCCESS: API returned 200")
            # Verify it's an image
            if response.headers['content-type'] == 'image/png':
                print("SUCCESS: Content-Type is image/png")
            else:
                print(f"FAILURE: Content-Type is {response.headers.get('content-type')}")
        else:
            print(f"FAILURE: Status code {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"FAILURE: Connection error {e}")

if __name__ == "__main__":
    test_process_image()
