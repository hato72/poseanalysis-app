from flask import Flask, request, jsonify
import cv2
import mediapipe as mp
import numpy as np
import base64

app = Flask(__name__)

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0:
        angle = 360-angle
    return angle

@app.route('/analyze-pose', methods=['POST'])
def analyze_pose():
    image_data = base64.b64decode(request.json['image'])
    nparr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    with mp_pose.Pose(static_image_mode=True, model_complexity=2, enable_segmentation=True) as pose:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        if not results.pose_landmarks:
            return jsonify({"error": "No pose detected"}), 400

        landmarks = results.pose_landmarks.landmark
        
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        
        upper_body_angle = calculate_angle(shoulder, hip, [hip[0], 0])

        ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
        back_leg_angle = calculate_angle(hip, ankle, [ankle[0], 0])

        front_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        front_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        front_leg_angle = calculate_angle([front_knee[0], 0], front_knee, front_ankle)

        image_height, image_width, _ = image.shape
        cv2.putText(image, f"Upper body angle: {upper_body_angle:.2f}", 
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(image, f"Back leg angle: {back_leg_angle:.2f}", 
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(image, f"Front leg angle: {front_leg_angle:.2f}", 
                    (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        mp_drawing.draw_landmarks(
            image,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
            connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2)
        )

        _, buffer = cv2.imencode('.jpg', image)
        processed_image = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            "processedImage": processed_image,
            "upperBodyAngle": upper_body_angle,
            "backLegAngle": back_leg_angle,
            "frontLegAngle": front_leg_angle
        })

if __name__ == '__main__':
    app.run(port=5000)