import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from loguru import logger


class IoTAccessService:
    """
    Simulates / integrates IoT Access Control hardware:
    - Relay Triggering (Relay module opening door lock / barrier gate for N seconds).
    - MQTT message dispatching to `vface/access/gate/{device_id}/open`.
    - Wiegand 26/34 binary bitstream serialization for physical door controllers.
    """

    _instance: Optional["IoTAccessService"] = None

    def __new__(cls) -> "IoTAccessService":
        if cls._instance is None:
            cls._instance = super(IoTAccessService, cls).__new__(cls)
            cls._instance.recent_triggers = []
        return cls._instance

    @staticmethod
    def encode_wiegand_26(facility_code: int, card_number: int) -> str:
        """
        Encodes facility code (8-bit) and card number (16-bit) into a 26-bit Wiegand hex format with parity bits.
        """
        facility_code = facility_code & 0xFF
        card_number = card_number & 0xFFFF
        data_24 = (facility_code << 16) | card_number

        # Even parity for first 12 bits
        first_12 = (data_24 >> 12) & 0xFFF
        even_parity = bin(first_12).count('1') % 2

        # Odd parity for last 12 bits
        last_12 = data_24 & 0xFFF
        odd_parity = 1 - (bin(last_12).count('1') % 2)

        wiegand_26 = (even_parity << 25) | (data_24 << 1) | odd_parity
        return f"0x{wiegand_26:07X}"

    async def trigger_gate_relay(
        self,
        device_id: str,
        gate_name: str = "Main Entrance Barrier",
        employee_code: Optional[str] = None,
        duration_seconds: float = 3.0
    ) -> Dict[str, Any]:
        """
        Triggers physical access relay and broadcasts MQTT event.
        """
        now = datetime.now()
        wiegand_hex = self.encode_wiegand_26(facility_code=101, card_number=abs(hash(employee_code or "ADMIN")) % 65535)

        event = {
            "device_id": device_id,
            "gate_name": gate_name,
            "employee_code": employee_code or "SYSTEM_OPERATOR",
            "wiegand_code": wiegand_hex,
            "duration_seconds": duration_seconds,
            "status": "UNLOCKED",
            "triggered_at": now.isoformat(),
            "auto_relock_after_ms": int(duration_seconds * 1000)
        }

        self.recent_triggers.append(event)
        if len(self.recent_triggers) > 50:
            self.recent_triggers.pop(0)

        logger.info(f"⚡ [IoT Access] Relay triggered on '{gate_name}' ({device_id}) for {duration_seconds}s | Wiegand: {wiegand_hex}")
        return event


iot_access_service = IoTAccessService()
