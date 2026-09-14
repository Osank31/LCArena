import asyncio
import time

from fastapi import HTTPException, Request, status
from schemas.suggestion_schema import GetSuggestionRequest, GetSuggestionResponse
from services.suggestion_service import SuggestionService
from utils.logger import logger


class SuggestionController:
    def __init__(self, service: SuggestionService):
        self.service = service

    async def get_suggestion(self, data: GetSuggestionRequest, request: Request) -> GetSuggestionResponse:
        start_time = time.perf_counter()

        if len(data.prefix) == 0 and len(data.suffix) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate suggestion: both prefix and suffix are empty."
            )

        llm_task = asyncio.create_task(self.service.get_suggestion(data))
        disconnect_task = asyncio.create_task(self._watch_disconnect(request))

        try:
            done, pending = await asyncio.wait(
                {llm_task, disconnect_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            if disconnect_task in done:
                logger.info("Client disconnected — cancelling in-flight LLM call")
                llm_task.cancel()
                try:
                    await llm_task
                except asyncio.CancelledError:
                    pass
                # 499 is the conventional "client closed request" status,
                # though the client will never see this response.
                raise HTTPException(status_code=499, detail="Client disconnected")

            disconnect_task.cancel()
            completion_response = llm_task.result()

            elapsed_time = time.perf_counter() - start_time
            latency_ms = round(elapsed_time * 1000, 2)

            return GetSuggestionResponse(
                id=completion_response.id,
                model=completion_response.model,
                choices=completion_response.choices,
                usage=completion_response.usage,
                latency_ms=latency_ms,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference engine failure: {str(e)}"
            )

    async def _watch_disconnect(self, request: Request, poll_interval: float = 0.25):
        while True:
            if await request.is_disconnected():
                return
            await asyncio.sleep(poll_interval)