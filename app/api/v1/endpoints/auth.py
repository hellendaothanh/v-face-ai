import httpx
from loguru import logger
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NoFaceDetectedException, VFaceException
from app.core.liveness_detector import liveness_detector
from app.database.session import get_db
from app.schemas.common import ResponseBase
from app.services.attendance_service import AttendanceService
from app.services.face_engine import face_engine, ExtractedFace

router = APIRouter()


@router.post("/face-login", summary="1-Click Biometric Face ID Login")
async def face_login(
    image: UploadFile = File(..., description="Webcam snapshot for biometric login"),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user by facial biometrics:
    1. 512D ArcFace vector extraction
    2. Anti-spoofing liveness check (MiniFASNetV2)
    3. Multi-template pgvector Cosine similarity matching
    4. JWT Token issuance from Core User IAM microservice
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tập tin tải lên phải là hình ảnh hợp lệ (JPEG/PNG/WebP)"
        )

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dữ liệu hình ảnh trống"
        )

    # 1. Extract 512D Face Vector
    try:
        extracted: ExtractedFace = face_engine.extract_single_face(
            image_bytes=image_bytes,
            require_single_face=False
        )
    except NoFaceDetectedException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "NO_FACE_DETECTED",
                "message": "Không tìm thấy khuôn mặt trong khung hình. Vui lòng nhìn thẳng vào camera."
            }
        )
    except VFaceException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "FACE_ENGINE_ERROR", "message": str(e.detail)}
        )

    # 2. Anti-Spoofing Liveness Detection on Cropped Face
    liveness_score = 1.0
    if extracted.face_crop is not None and extracted.face_crop.size > 0:
        is_real, liveness_score = liveness_detector.predict_liveness(extracted.face_crop)
        if not is_real and liveness_score < 0.35:
            logger.warning(f"Face Login rejected by Anti-Spoofing engine. Score: {liveness_score:.3f}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "SPOOF_DETECTED",
                    "message": "Phát hiện hình ảnh giả mạo hoặc video tái tạo (Anti-Spoofing Alert)",
                    "liveness_score": round(liveness_score, 3)
                }
            )

    # 3. Check for Identity Conflict / Multi-Account Ambiguity
    conflicts = await AttendanceService.check_identity_conflict(
        db=db,
        query_embedding=extracted.embedding,
        min_similarity=0.65,
        max_similarity_gap=0.05
    )
    if conflicts and len(conflicts) >= 2:
        candidate_names = ", ".join([f"{c['employee_code']} ({c['full_name']})" for c in conflicts])
        logger.warning(f"🚨 [Face Login Ambiguity] Multi-identity conflict detected: {candidate_names}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "IDENTITY_CONFLICT_REQUIRES_PASSWORD",
                "message": f"Phát hiện khuôn mặt trùng khớp với nhiều hồ sơ ({candidate_names}). Để bảo mật, vui lòng đăng nhập bằng Mật khẩu.",
                "candidates": conflicts
            }
        )

    # 4. Match against registered 5-angle pgvector templates
    match_result = await AttendanceService.match_face_multi_template(
        db=db,
        query_embedding=extracted.embedding,
        min_similarity=None
    )

    if not match_result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "FACE_NOT_REGISTERED",
                "message": "Khuôn mặt chưa được đăng ký trong hệ thống hoặc không khớp với bất kỳ nhân sự nào."
            }
        )

    matched_face, matched_employee, distance, similarity = match_result
    confidence_percent = round(similarity * 100.0, 2)

    logger.info(
        f"👤 Face Login match: {matched_employee.full_name} ({matched_employee.employee_code}) | "
        f"Confidence: {confidence_percent}% (Cosine Sim: {similarity:.4f})"
    )

    if similarity < settings.FACE_SIMILARITY_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "LOW_CONFIDENCE",
                "message": f"Độ khớp sinh trắc học không đạt ngưỡng an toàn ({confidence_percent}% < {settings.FACE_SIMILARITY_THRESHOLD * 100}%).",
                "confidence_percent": confidence_percent
            }
        )

    # 4. Request JWT Token from Core User Service (Port 8001)
    core_user_url = f"{settings.CORE_USER_SERVICE_URL}/auth/face-token"
    token_payload = {
        "user_code": matched_employee.employee_code,
        "username": matched_employee.employee_code,
        "employee_id": str(matched_employee.id),
        "email": matched_employee.email,
        "full_name": matched_employee.full_name,
        "phone_number": matched_employee.phone_number,
        "department": matched_employee.department,
        "position": matched_employee.position
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(core_user_url, json=token_payload)
            if resp.status_code != 200:
                logger.error(f"Core User IAM token issue failed: {resp.status_code} {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "IAM_AUTH_FAILED",
                        "message": "Xác thực phân quyền IAM thất bại"
                    }
                )
            token_data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to Core User IAM at {core_user_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "IAM_UNAVAILABLE",
                "message": "Không thể kết nối đến Dịch vụ Quản lý Định danh Core User IAM"
            }
        )

    return ResponseBase(
        success=True,
        message=f"Đăng nhập sinh trắc học Face ID thành công! Chào mừng {matched_employee.full_name}",
        data={
            "tokens": token_data,
            "employee": {
                "id": str(matched_employee.id),
                "employee_code": matched_employee.employee_code,
                "full_name": matched_employee.full_name,
                "department": matched_employee.department,
                "position": matched_employee.position
            },
            "match_metrics": {
                "confidence_percent": confidence_percent,
                "cosine_similarity": round(similarity, 4),
                "liveness_score": round(liveness_score, 3)
            }
        }
    )
