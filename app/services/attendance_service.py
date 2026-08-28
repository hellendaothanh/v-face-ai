import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import (
    EmployeeNotFoundException,
    FaceNotRecognizedException,
)
from app.models.attendance import AttendanceRecord, AttendanceType
from app.models.employee import Employee
from app.models.face_feature import FaceFeature
from app.schemas.attendance import (
    AttendanceCheckInResponse,
    AttendanceFilterParams,
    AttendanceRecordRead,
)
from app.schemas.common import PaginatedResponse
from app.schemas.face import FaceRegisterItemResult, FaceRegisterResponse
from app.services.face_engine import ExtractedFace, face_engine


class AttendanceService:
    @staticmethod
    async def match_face_multi_template(
        db: AsyncSession,
        query_embedding: list[float],
        min_similarity: Optional[float] = None
    ) -> Optional[Tuple[FaceFeature, Employee, float, float]]:
        """
        Multi-template pgvector matching:
        Compares query vector against ALL stored face templates of all active employees.
        Returns the closest matching (FaceFeature, Employee, distance, similarity) if similarity >= min_similarity.
        """
        threshold = min_similarity if min_similarity is not None else settings.FACE_SIMILARITY_THRESHOLD
        distance_col = FaceFeature.embedding.cosine_distance(query_embedding).label("distance")

        # Query the single closest face template across all registered templates
        stmt = (
            select(
                FaceFeature,
                Employee,
                distance_col
            )
            .join(Employee, FaceFeature.employee_id == Employee.id)
            .where(Employee.is_active.is_(True))
            .order_by(distance_col)
            .limit(1)
        )

        res = await db.execute(stmt)
        matched_row = res.first()

        if not matched_row:
            return None

        matched_face, matched_employee, distance = matched_row
        similarity = float(1.0 - distance)

        return (matched_face, matched_employee, distance, similarity)

    @staticmethod
    async def register_employee_faces(
        db: AsyncSession,
        employee_id: uuid.UUID,
        image_files: List[Tuple[str, bytes]]
    ) -> FaceRegisterResponse:
        """
        Registers one or multiple face templates for a specific employee (Multi-template support).
        Extracts 512-D vectors with quality/blur checking and stores them in `face_features`.
        """
        # Verify employee existence
        query = select(Employee).where(Employee.id == employee_id)
        result = await db.execute(query)
        employee = result.scalar_one_or_none()

        if not employee:
            raise EmployeeNotFoundException(employee_id)

        item_results: List[FaceRegisterItemResult] = []
        registered_count = 0

        # Ensure upload dir exists
        employee_upload_dir = os.path.join(settings.UPLOAD_DIR, "faces", str(employee.id))
        os.makedirs(employee_upload_dir, exist_ok=True)

        for filename, file_bytes in image_files:
            try:
                # Extract single face (dominant primary face)
                extracted: ExtractedFace = face_engine.extract_single_face(
                    image_bytes=file_bytes,
                    require_single_face=False
                )

                # Check if image is blurry
                if extracted.blur_score < 30.0:
                    logger.warning(
                        f"Template image '{filename}' has low sharpness ({extracted.blur_score:.1f}). "
                        f"Registration continued, but higher sharpness is recommended."
                    )

                # Save raw face image file
                saved_filename = f"{uuid.uuid4().hex[:12]}_{filename}"
                saved_path = os.path.join(employee_upload_dir, saved_filename)
                with open(saved_path, "wb") as f:
                    f.write(file_bytes)

                # Save vector embedding into PostgreSQL (pgvector)
                face_feature = FaceFeature(
                    id=uuid.uuid4(),
                    employee_id=employee.id,
                    embedding=extracted.embedding,
                    image_path=saved_path,
                    detection_score=extracted.detection_score
                )
                db.add(face_feature)
                await db.flush()

                registered_count += 1
                item_results.append(FaceRegisterItemResult(
                    filename=filename,
                    face_id=face_feature.id,
                    success=True,
                    detection_score=extracted.detection_score,
                    blur_score=extracted.blur_score,
                    error_detail=None
                ))
            except Exception as e:
                logger.warning(f"Failed to register face from image '{filename}': {str(e)}")
                item_results.append(FaceRegisterItemResult(
                    filename=filename,
                    face_id=None,
                    success=False,
                    detection_score=None,
                    blur_score=None,
                    error_detail=str(e)
                ))

        await db.commit()

        return FaceRegisterResponse(
            employee_id=employee.id,
            employee_code=employee.employee_code,
            total_uploaded=len(image_files),
            total_registered=registered_count,
            results=item_results
        )

    @classmethod
    async def recognize_and_check_in(
        cls,
        db: AsyncSession,
        image_bytes: bytes,
        attendance_type: AttendanceType = AttendanceType.CHECK_IN,
        device_id: Optional[str] = None,
        note: Optional[str] = None
    ) -> AttendanceCheckInResponse:
        """
        Extracts face from camera snapshot, executes Multi-template Cosine Distance search on pgvector,
        and logs attendance record with detailed confidence metrics.
        """
        # Extract face from snapshot (takes dominant face if multiple)
        extracted: ExtractedFace = face_engine.extract_single_face(
            image_bytes=image_bytes,
            require_single_face=False
        )

        match_result = await cls.match_face_multi_template(
            db=db,
            query_embedding=extracted.embedding,
            min_similarity=None
        )

        if not match_result:
            raise FaceNotRecognizedException(best_similarity=0.0)

        matched_face, matched_employee, distance, similarity = match_result
        confidence_percent = similarity * 100.0

        logger.info(
            f"🔍 Multi-template match: {matched_employee.full_name} ({matched_employee.employee_code}) | "
            f"Confidence: {confidence_percent:.2f}% (Cosine Sim: {similarity:.4f}, Dist: {distance:.4f}) | "
            f"Blur Score: {extracted.blur_score:.1f} | Det Score: {extracted.detection_score:.3f} | "
            f"Matched Template ID: {matched_face.id}"
        )

        if similarity < settings.FACE_SIMILARITY_THRESHOLD:
            raise FaceNotRecognizedException(best_similarity=round(similarity, 4))

        # Save snapshot for audit if required
        snapshot_dir = os.path.join(settings.UPLOAD_DIR, "snapshots", datetime.now().strftime("%Y-%m-%d"))
        os.makedirs(snapshot_dir, exist_ok=True)
        snapshot_path = os.path.join(snapshot_dir, f"{uuid.uuid4().hex[:12]}_checkin.jpg")
        try:
            with open(snapshot_path, "wb") as f:
                f.write(image_bytes)
        except Exception as e:
            logger.warning(f"Could not save check-in snapshot image: {e}")
            snapshot_path = None

        # Create attendance record
        record = AttendanceRecord(
            id=uuid.uuid4(),
            employee_id=matched_employee.id,
            check_time=datetime.now(timezone.utc),
            attendance_type=attendance_type,
            confidence_score=round(similarity, 4),
            matched_face_id=matched_face.id,
            device_id=device_id,
            snapshot_path=snapshot_path,
            note=note
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        return AttendanceCheckInResponse(
            record_id=record.id,
            employee_id=matched_employee.id,
            employee_code=matched_employee.employee_code,
            full_name=matched_employee.full_name,
            department=matched_employee.department,
            position=matched_employee.position,
            check_time=record.check_time,
            attendance_type=record.attendance_type,
            confidence_score=round(similarity, 4),
            message=f"Điểm danh {attendance_type.value} thành công cho nhân viên {matched_employee.full_name} (Độ tin cậy: {confidence_percent:.1f}%)"
        )

    @staticmethod
    async def get_attendance_history(
        db: AsyncSession,
        params: AttendanceFilterParams
    ) -> PaginatedResponse[AttendanceRecordRead]:
        """
        Retrieves paginated attendance history with flexible filters.
        """
        query = (
            select(AttendanceRecord)
            .join(Employee, AttendanceRecord.employee_id == Employee.id)
            .options(selectinload(AttendanceRecord.employee))
        )

        if params.employee_code:
            query = query.where(Employee.employee_code.ilike(f"%{params.employee_code.strip()}%"))

        if params.department:
            query = query.where(Employee.department.ilike(f"%{params.department.strip()}%"))

        if params.attendance_type:
            query = query.where(AttendanceRecord.attendance_type == params.attendance_type)

        if params.start_date:
            start_dt = datetime.combine(params.start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            query = query.where(AttendanceRecord.check_time >= start_dt)

        if params.end_date:
            end_dt = datetime.combine(params.end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            query = query.where(AttendanceRecord.check_time <= end_dt)

        # Count total items
        count_stmt = select(func.count()).select_from(query.subquery())
        total_count = (await db.execute(count_stmt)).scalar_one() or 0

        # Pagination & Ordering
        offset = (params.page - 1) * params.page_size
        query = query.order_by(AttendanceRecord.check_time.desc()).offset(offset).limit(params.page_size)

        result = await db.execute(query)
        records = result.scalars().all()

        total_pages = (total_count + params.page_size - 1) // params.page_size if total_count > 0 else 0

        # Convert to Pydantic models
        items = [AttendanceRecordRead.model_validate(r) for r in records]

        return PaginatedResponse(
            items=items,
            total=total_count,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages
        )

    @staticmethod
    async def auto_update_face_feature(
        db: AsyncSession,
        employee_id: uuid.UUID,
        new_embedding: list[float],
        detection_score: float = 0.99,
        snapshot_path: Optional[str] = None
    ) -> Optional[FaceFeature]:
        """
        Tự động cập nhật mẫu khuôn mặt (Auto Face Update / Continuous Learning):
        Khi nhân viên chấm công thành công với độ tin cậy cực cao (> 95%),
        hệ thống tự động học và lưu vector mới nhất vào database.
        Giới hạn tối đa 8 template/nhân viên (xoay vòng template tự học cũ nhất nếu vượt quá).
        """
        try:
            stmt = (
                select(FaceFeature)
                .where(FaceFeature.employee_id == employee_id)
                .order_by(FaceFeature.created_at.asc())
            )
            res = await db.execute(stmt)
            templates = list(res.scalars().all())

            # Giữ tối thiểu 5 ảnh gốc khi đăng ký, chỉ xoay vòng template thứ 6 trở đi
            if len(templates) >= 8:
                oldest_dynamic = templates[5] if len(templates) > 5 else templates[-1]
                oldest_dynamic.embedding = new_embedding
                oldest_dynamic.detection_score = detection_score
                if snapshot_path:
                    oldest_dynamic.image_path = snapshot_path
                oldest_dynamic.created_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(oldest_dynamic)
                logger.info(f"✨ [Auto Face Update] Cập nhật template tự học ({oldest_dynamic.id}) cho nhân viên {employee_id}")
                return oldest_dynamic
            else:
                new_feature = FaceFeature(
                    id=uuid.uuid4(),
                    employee_id=employee_id,
                    embedding=new_embedding,
                    image_path=snapshot_path,
                    detection_score=detection_score,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_feature)
                await db.commit()
                await db.refresh(new_feature)
                logger.info(f"✨ [Auto Face Update] Bổ sung template tự học mới ({new_feature.id}) cho nhân viên {employee_id}")
                return new_feature
        except Exception as e:
            logger.warning(f"Failed to auto-update face feature: {e}")
            return None


attendance_service = AttendanceService()
