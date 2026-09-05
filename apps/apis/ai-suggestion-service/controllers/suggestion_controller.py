import time

from fastapi import HTTPException, status

from schemas.suggestion_schema import GetSuggestionRequest, GetSuggestionResponse, SuggestionChoices, SuggestionUsage
from services.suggestion_service import SuggestionService

from utils.logger import logger

class SuggestionController:
    def __init__(self, service: SuggestionService):
        self.service=service
    
    async def get_suggestion(self, data: GetSuggestionRequest)->GetSuggestionResponse:
        start_time=time.perf_counter()

        if len(data.prefix) == 0 and len(data.suffix) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate suggestion: both prefix and suffix are empty."
            )
        try:
            completion_response=self.service.get_suggestion(data)
            logger.info(f"Completion response: {completion_response}")
            elapsed_time=time.perf_counter() - start_time
            latency_ms=round(elapsed_time * 1000, 2)

            return GetSuggestionResponse(
                id=completion_response.id,
                model=completion_response.model,
                choices=completion_response.choices,
                usage=completion_response.usage,
                latency_ms=latency_ms
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference engine failure: {str(e)}"
            )