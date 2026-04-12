"""Judge0 CE client — submits code and polls for results."""
import asyncio
import logging
import os
import httpx

logger = logging.getLogger(__name__)

JUDGE0_URL = os.getenv("JUDGE0_URL", "http://judge0:2358")
POLL_INTERVAL = 1.0   # seconds between polls
MAX_WAIT = 60.0        # max seconds to wait for a result

LANGUAGE_NAMES = {
    71: "Python 3",
    63: "JavaScript",
    62: "Java",
    54: "C++",
}


async def submit_and_wait(
    source_code: str,
    language_id: int,
    stdin: str = "",
    expected_output: str = "",
    time_limit: int = 5,
    memory_limit: int = 128,
) -> dict:
    """
    Submit to Judge0 CE and poll until done.
    Returns dict with: status, stdout, stderr, time, memory, compile_output
    """
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin,
        "expected_output": expected_output,
        "cpu_time_limit": time_limit,
        "memory_limit": memory_limit * 1000,  # KB
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                f"{JUDGE0_URL}/submissions",
                json=payload,
                params={"base64_encoded": "false", "wait": "false"},
            )
            resp.raise_for_status()
            token = resp.json().get("token")
            if not token:
                return _error_result("No token returned from Judge0")
        except Exception as e:
            logger.error(f"Judge0 submit error: {e}")
            return _error_result(str(e))

        # Poll
        waited = 0.0
        async with httpx.AsyncClient(timeout=10.0) as poll_client:
            while waited < MAX_WAIT:
                await asyncio.sleep(POLL_INTERVAL)
                waited += POLL_INTERVAL
                try:
                    poll = await poll_client.get(
                        f"{JUDGE0_URL}/submissions/{token}",
                        params={"base64_encoded": "false", "fields": "status,stdout,stderr,compile_output,time,memory"},
                    )
                    data = poll.json()
                    status_id = data.get("status", {}).get("id", 0)
                    if status_id > 2:  # not In Queue or Processing
                        return {
                            "status_id": status_id,
                            "status": data.get("status", {}).get("description", "Unknown"),
                            "stdout": (data.get("stdout") or "").strip(),
                            "stderr": (data.get("stderr") or "").strip(),
                            "compile_output": (data.get("compile_output") or "").strip(),
                            "time_ms": int(float(data.get("time") or 0) * 1000),
                            "memory_kb": data.get("memory") or 0,
                        }
                except Exception as e:
                    logger.warning(f"Poll error: {e}")

    return _error_result("Timeout waiting for Judge0")


def _error_result(msg: str) -> dict:
    return {
        "status_id": 13,
        "status": "Internal Error",
        "stdout": "",
        "stderr": msg,
        "compile_output": "",
        "time_ms": 0,
        "memory_kb": 0,
    }


def get_language_name(language_id: int) -> str:
    return LANGUAGE_NAMES.get(language_id, f"Language {language_id}")
