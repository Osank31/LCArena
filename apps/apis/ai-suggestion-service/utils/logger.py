# logger.py
import logging
import time
import uuid

from fastapi import FastAPI, Request

logger = logging.getLogger("fastapi")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)


def setup_logger(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        request_id = str(uuid.uuid4())
        start = time.perf_counter()

        try:
            response = await call_next(request)

            duration = (time.perf_counter() - start) * 1000

            logger.info(
                "%s %s -> %s | %.2f ms | request_id=%s | client=%s",
                request.method,
                request.url.path,
                response.status_code,
                duration,
                request_id,
                request.client.host if request.client else "unknown",
            )

            response.headers["X-Request-ID"] = request_id
            return response

        except Exception:
            duration = (time.perf_counter() - start) * 1000

            logger.exception(
                "%s %s -> 500 | %.2f ms | request_id=%s",
                request.method,
                request.url.path,
                duration,
                request_id,
            )
            raise