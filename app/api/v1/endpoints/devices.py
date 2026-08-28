from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.device import Device, DevicePurpose
from app.schemas.common import ResponseBase
from app.schemas.device import DeviceCreate, DeviceResponse, DeviceToggleResponse, DeviceUpdate
from app.services.camera_manager import camera_manager

router = APIRouter(prefix="/devices", tags=["Camera Devices (Quản lý thiết bị)"])


@router.get("", response_model=ResponseBase[List[DeviceResponse]])
async def list_devices(
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách tất cả các thiết bị Camera trong hệ thống kèm trạng thái kết nối thời gian thực.
    """
    res = await db.execute(select(Device).order_by(Device.created_at.asc()))
    devices = res.scalars().all()

    telemetry_map = camera_manager.get_all_statuses()

    result_items: List[DeviceResponse] = []
    for d in devices:
        telemetry = telemetry_map.get(str(d.id), {})
        is_conn = telemetry.get("is_connected", False) if d.is_active else False
        fps_val = telemetry.get("fps", 0.0) if d.is_active else 0.0
        checkins_cnt = telemetry.get("successful_checkins", 0)

        item = DeviceResponse(
            id=d.id,
            device_name=d.device_name,
            rtsp_url=d.rtsp_url,
            location=d.location,
            purpose=d.purpose,
            is_active=d.is_active,
            created_at=d.created_at,
            updated_at=d.updated_at,
            is_connected=is_conn,
            fps=fps_val,
            processed_count=checkins_cnt
        )
        result_items.append(item)

    return ResponseBase(
        success=True,
        message=f"Đã tải {len(result_items)} thiết bị camera.",
        data=result_items
    )


@router.post("", response_model=ResponseBase[DeviceResponse], status_code=status.HTTP_201_CREATED)
async def create_device(
    payload: DeviceCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Thêm một camera mới vào hệ thống (Webcam hoặc luồng RTSP IP Camera).
    Nếu is_active = True, CameraManager sẽ tự động khởi chạy worker kết nối.
    """
    new_device = Device(
        id=uuid.uuid4(),
        device_name=payload.device_name,
        rtsp_url=payload.rtsp_url,
        location=payload.location,
        purpose=payload.purpose,
        is_active=payload.is_active
    )
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)

    # If active, start worker thread
    if new_device.is_active:
        camera_manager.start_worker_for_device(new_device)

    telemetry = camera_manager.get_device_status(new_device.id) or {}
    response_data = DeviceResponse(
        id=new_device.id,
        device_name=new_device.device_name,
        rtsp_url=new_device.rtsp_url,
        location=new_device.location,
        purpose=new_device.purpose,
        is_active=new_device.is_active,
        created_at=new_device.created_at,
        updated_at=new_device.updated_at,
        is_connected=telemetry.get("is_connected", False) if new_device.is_active else False,
        fps=telemetry.get("fps", 0.0) if new_device.is_active else 0.0,
        processed_count=0
    )

    return ResponseBase(
        success=True,
        message=f"Đã thêm thiết bị '{new_device.device_name}' thành công.",
        data=response_data
    )


@router.put("/{device_id}/toggle", response_model=ResponseBase[DeviceToggleResponse])
async def toggle_device_status(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Bật / Tắt nhanh luồng camera từ xa theo thời gian thực (Start/Stop worker thread).
    """
    success, device = await camera_manager.toggle_device(db=db, device_id=device_id)
    if not success or not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thiết bị với ID: {device_id}"
        )

    action_str = "kích hoạt và bắt đầu quét" if device.is_active else "tạm dừng luồng xử lý"
    return ResponseBase(
        success=True,
        message=f"Thiết bị '{device.device_name}' đã {action_str}.",
        data=DeviceToggleResponse(
            id=device.id,
            device_name=device.device_name,
            is_active=device.is_active,
            message=f"Đã {action_str} thành công."
        )
    )


@router.put("/{device_id}", response_model=ResponseBase[DeviceResponse])
async def update_device(
    device_id: uuid.UUID,
    payload: DeviceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Cập nhật thông tin cấu hình của Camera.
    """
    res = await db.execute(select(Device).where(Device.id == device_id))
    device = res.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thiết bị với ID: {device_id}"
        )

    try:
        # Stop current worker before modifying connection details
        await camera_manager.stop_worker_for_device(device_id)

        if payload.device_name is not None:
            device.device_name = payload.device_name
        if payload.rtsp_url is not None:
            device.rtsp_url = payload.rtsp_url
        if payload.location is not None:
            device.location = payload.location
        if payload.purpose is not None:
            device.purpose = payload.purpose
        if payload.is_active is not None:
            device.is_active = payload.is_active

        await db.commit()
        await db.refresh(device)

        telemetry = camera_manager.get_device_status(device_id) or {}
        is_conn = telemetry.get("is_connected", False) if device.is_active else False
        fps_val = telemetry.get("fps", 0.0) if device.is_active else 0.0
        checkins_cnt = telemetry.get("successful_checkins", 0)

        response_data = DeviceResponse(
            id=device.id,
            device_name=device.device_name,
            rtsp_url=device.rtsp_url,
            location=device.location,
            purpose=device.purpose,
            is_active=device.is_active,
            created_at=device.created_at,
            updated_at=device.updated_at,
            is_connected=is_conn,
            fps=fps_val,
            processed_count=checkins_cnt
        )

        return ResponseBase(
            success=True,
            message=f"Đã cập nhật cấu hình '{device.device_name}' thành công.",
            data=response_data
        )
    except Exception as e:
        logger.error(f"Error updating device {device_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật camera: {str(e)}"
        )


@router.delete("/{device_id}", response_model=ResponseBase[dict])
async def delete_device(
    device_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Xóa thiết bị Camera khỏi hệ thống.
    """
    res = await db.execute(select(Device).where(Device.id == device_id))
    device = res.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy thiết bị với ID: {device_id}"
        )

    # Stop worker
    await camera_manager.stop_worker_for_device(device_id)

    await db.delete(device)
    await db.commit()

    return ResponseBase(
        success=True,
        message=f"Đã xóa thiết bị '{device.device_name}' thành công.",
        data={"id": str(device_id)}
    )
