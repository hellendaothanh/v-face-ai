from typing import Any, Optional
from fastapi import HTTPException, status


class VFaceException(HTTPException):
    """Base exception for application errors"""
    def __init__(
        self,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        detail: Any = None,
        headers: Optional[dict[str, str]] = None
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class EmployeeNotFoundException(VFaceException):
    def __init__(self, employee_id: Any) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID '{employee_id}' does not exist."
        )


class EmployeeCodeAlreadyExistsException(VFaceException):
    def __init__(self, code: str) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee code '{code}' is already registered in the system."
        )


class NoFaceDetectedException(VFaceException):
    def __init__(self, detail: str = "No face detected in the provided image. Please provide a clear portrait.") -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class MultipleFacesDetectedException(VFaceException):
    def __init__(self, count: int) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Found {count} faces in image. Face registration requires exactly 1 face per image."
        )


class FaceNotRecognizedException(VFaceException):
    def __init__(self, best_similarity: float = 0.0) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Face was not recognized in database. Highest similarity: {best_similarity:.2f}"
        )


class InvalidImageFormatException(VFaceException):
    def __init__(self, detail: str = "Invalid or corrupted image format. Supported formats: JPEG, PNG, WEBP.") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )
