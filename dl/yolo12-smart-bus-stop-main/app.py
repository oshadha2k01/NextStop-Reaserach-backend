import argparse
import os
import time
import cv2
from ultralytics import YOLO
import cvzone
from pymongo import MongoClient
from datetime import datetime
import urllib.request
import numpy as np


def parse_args():
    p = argparse.ArgumentParser(description='Run YOLO tracker on a video')
    p.add_argument('--video', '-v', default='http://192.168.8.163/stream', help='Camera index, input video file path, or HTTP stream URL (default: ESP32 stream)')
    p.add_argument('--model', '-m', default=None, help='Path to YOLO model file (default: ../yolo12s.pt)')
    p.add_argument('--output', '-o', default=None, help='Path to save annotated output video (optional)')
    p.add_argument('--max-frames', type=int, default=0, help='Max frames to process (0 = all)')
    p.add_argument('--camera-test', action='store_true', help='Show raw camera feed only (no YOLO), useful for stream testing')
    return p.parse_args()


args = parse_args()

# MongoDB setup
MONGO_URL = "mongodb+srv://NextBus:RPSLIIT@researchp.pf7k4qq.mongodb.net/NextBusDB?retryWrites=true&w=majority"
try:
    mongo_client = MongoClient(MONGO_URL)
    db = mongo_client['NextBusDB']
    collection = db['people_count']
    print("Connected to MongoDB successfully!")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    mongo_client = None

# Resolve paths relative to this script
ROOT = os.path.dirname(__file__)
default_model = os.path.normpath(os.path.join(ROOT, '..', 'yolo12s.pt'))
model_path = args.model if args.model is not None else default_model
if not os.path.exists(model_path):
    print(f"Model not found at {model_path}. Ultralytics will attempt to download it if needed.")

# Custom MJPEG Stream Reader for ESP32-CAM
class MJPEGStreamReader:
    def __init__(self, url, max_retries=3):
        self.url = url
        self.stream = None
        self.max_retries = max_retries
        self.connect()
    
    def connect(self):
        for attempt in range(1, self.max_retries + 1):
            try:
                print(f"Attempting to connect to stream (attempt {attempt}/{self.max_retries})...")
                req = urllib.request.Request(self.url, headers={'User-Agent': 'Mozilla/5.0'})
                self.stream = urllib.request.urlopen(req, timeout=5)
                print(f"✓ Connected to MJPEG stream: {self.url}")
                return
            except Exception as e:
                print(f"✗ Connection attempt {attempt} failed: {e}")
                if attempt < self.max_retries:
                    wait_time = 2 * attempt
                    print(f"  Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
        
        # All retries failed
        print("\nConnection failed after all retries!")
        print("Troubleshooting:")
        print("1. Make sure ESP32-CAM is powered on")
        print("2. Verify it's connected to WiFi (check Arduino Serial Monitor)")
        print("3. Test in browser: " + self.url)
        print("4. Try reducing JPEG quality in ESP32 code (change 80 to 40)")
        print("5. Restart the ESP32 with power cycle")
        raise RuntimeError(f"Cannot connect to stream: {self.url}")
    
    def read_frame(self):
        """Read and decode the next JPEG frame from the MJPEG stream"""
        try:
            while True:
                byte = self.stream.read(1)
                if not byte:
                    print("Stream closed by server")
                    return False, None
                if byte == b'\xff':
                    next_byte = self.stream.read(1)
                    if next_byte == b'\xd8':  # JPEG start marker
                        jpeg_data = b'\xff\xd8'
                        while True:
                            byte = self.stream.read(1)
                            if not byte:
                                break
                            jpeg_data += byte
                            if byte == b'\xd9' and jpeg_data[-2:-1] == b'\xff':
                                # Found JPEG end marker
                                nparr = np.frombuffer(jpeg_data, np.uint8)
                                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                                if frame is not None:
                                    return True, frame
                                else:
                                    break
        except Exception as e:
            print(f"Error reading frame: {e}")
            return False, None
    
    def release(self):
        if self.stream:
            self.stream.close()
    
    def get(self, prop):
        """Dummy method for compatibility"""
        return None

# Open webcam/video source
video_arg = str(args.video).strip()
source = int(video_arg) if video_arg.isdigit() else video_arg

# Determine if we're using an HTTP stream or a local camera
is_http_stream = isinstance(source, str) and source.startswith(('http://', 'https://'))

if isinstance(source, int):
    # Local webcam
    cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
    is_mjpeg_stream = False
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open camera {source}")
    print(f"Successfully connected to camera {source}")
    print(f"Resolution: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
elif is_http_stream:
    # HTTP MJPEG stream
    cap = MJPEGStreamReader(source)
    is_mjpeg_stream = True
    print("Successfully connected to HTTP stream")
else:
    # Local file
    if not os.path.isabs(source):
        source = os.path.join(ROOT, source)
    if not os.path.exists(source):
        raise RuntimeError(f"Video '{source}' not found.")
    cap = cv2.VideoCapture(source)
    is_mjpeg_stream = False
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open video file: {source}")
    print(f"Successfully opened video file: {source}")
    print(f"Resolution: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")

# Dedicated testing mode for quick source verification
if args.camera_test:
    print("Running stream test mode (raw feed). Press ESC to exit.")
    processed_frames = 0
    while True:
        if is_mjpeg_stream:
            ret, frame = cap.read_frame()
        else:
            ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.resize(frame, (1020, 600))
        cv2.imshow("Stream Test", frame)
        if cv2.waitKey(1) & 0xFF == 27:
            break
        processed_frames += 1
        if args.max_frames and processed_frames >= args.max_frames:
            print(f"Reached max frames: {args.max_frames}")
            break
    cap.release()
    cv2.destroyAllWindows()
    if mongo_client is not None:
        mongo_client.close()
    print(f"Test complete. Processed {processed_frames} frames.")
    raise SystemExit(0)

# Load YOLO model (person detection)
model = YOLO(model_path)
names = getattr(model, 'names', None)

# optional writer
writer = None
if args.output:
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    writer = cv2.VideoWriter(args.output, fourcc, fps, (width, height))

# Counting state
track_memory = {}  # track_id -> last centroid y
in_count = 0
out_count = 0
line_y = None
last_db_update = time.time()  # Track last database update time
UPDATE_INTERVAL = 5  # Send to MongoDB every 5 seconds

# Mouse debugging
def RGB(event, x, y, flags, param):
    # Print on mouse move for quick debugging (can be noisy)
    if event == cv2.EVENT_MOUSEMOVE:
        print(f"Mouse moved to: [{x}, {y}]")

cv2.namedWindow("RGB")
cv2.setMouseCallback("RGB", RGB)

processed_frames = 0

while True:
    if is_mjpeg_stream:
        ret, frame = cap.read_frame()
    else:
        ret, frame = cap.read()
    if not ret:
        break

    # Optionally resize for display/performance
    frame = cv2.resize(frame, (1020, 600))

    # Initialize counting line once (horizontal line at 50% height)
    if line_y is None:
        line_y = int(frame.shape[0] * 0.5)
    line_p1 = (0, line_y)
    line_p2 = (frame.shape[1], line_y)
    cv2.line(frame, line_p1, line_p2, (0, 0, 255), 2)

    # Detect people (class 0) using tracker
    results = model.track(frame, persist=True, classes=[0])

    # Defensive checks: ensure results and boxes exist
    if len(results) > 0 and hasattr(results[0], 'boxes'):
        boxes_obj = results[0].boxes
        ids = None
        try:
            if getattr(boxes_obj, 'id', None) is not None:
                ids = boxes_obj.id.cpu().numpy().astype(int)
        except Exception:
            ids = None

        try:
            boxes = boxes_obj.xyxy.cpu().numpy().astype(int) if getattr(boxes_obj, 'xyxy', None) is not None else []
        except Exception:
            boxes = []

        try:
            # boxes.cls may be a tensor; convert safely
            class_ids = boxes_obj.cls.cpu().numpy().astype(int).tolist() if getattr(boxes_obj, 'cls', None) is not None else []
        except Exception:
            class_ids = []

        if ids is not None and len(boxes) and len(class_ids):
            for box, track_id, class_id in zip(boxes, ids, class_ids):
                x1, y1, x2, y2 = box
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                # Count crossing: compare previous centroid y with current
                prev_y = track_memory.get(int(track_id))
                if prev_y is not None:
                    # moving from top to bottom -> IN
                    if prev_y < line_y and cy >= line_y:
                        in_count += 1
                    # moving from bottom to top -> OUT
                    elif prev_y > line_y and cy <= line_y:
                        out_count += 1
                track_memory[int(track_id)] = cy

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.circle(frame, (cx, cy), 4, (255, 0, 0), -1)
                cvzone.putTextRect(frame, f'{track_id}', (x1, y1), 1, 1)
            

    # Show IN/OUT counts
    cvzone.putTextRect(frame, f'IN: {in_count}', (10, 30), scale=2, thickness=2,
                       colorT=(255, 255, 255), colorR=(0, 128, 0))
    cvzone.putTextRect(frame, f'OUT: {out_count}', (10, 80), scale=2, thickness=2,
                       colorT=(255, 255, 255), colorR=(0, 0, 255))

    # Send data to MongoDB periodically
    current_time = time.time()
    if mongo_client is not None and (current_time - last_db_update) >= UPDATE_INTERVAL:
        try:
            data = {
                'timestamp': datetime.now(),
                'in_count': in_count,
                'out_count': out_count,
                'total_people': in_count - out_count,
                'frame_number': processed_frames
            }
            collection.insert_one(data)
            print(f"Data sent to MongoDB: IN={in_count}, OUT={out_count}, Total={in_count - out_count}")
            last_db_update = current_time
        except Exception as e:
            print(f"Error sending data to MongoDB: {e}")

    # Write frame if requested
    if writer is not None:
        try:
            writer.write(frame)
        except Exception:
            pass

    # Display frame
    cv2.imshow("RGB", frame)

    # Use a short delay so video plays; break on ESC
    if cv2.waitKey(1) & 0xFF == 27:
        break

    processed_frames += 1
    if args.max_frames and processed_frames >= args.max_frames:
        print(f"Reached max frames: {args.max_frames}")
        break

cap.release()
if writer is not None:
    writer.release()
cv2.destroyAllWindows()

# Final update to MongoDB
if mongo_client is not None:
    try:
        final_data = {
            'timestamp': datetime.now(),
            'in_count': in_count,
            'out_count': out_count,
            'total_people': in_count - out_count,
            'frame_number': processed_frames,
            'final': True
        }
        collection.insert_one(final_data)
        print(f"Final data sent to MongoDB: IN={in_count}, OUT={out_count}, Total={in_count - out_count}")
        mongo_client.close()
        print("MongoDB connection closed")
    except Exception as e:
        print(f"Error sending final data to MongoDB: {e}")

