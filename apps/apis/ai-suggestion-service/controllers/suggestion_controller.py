import time
import uuid

from fastapi import HTTPException, status

from schemas.suggestion_schema import GetSuggestionRequest, GetSuggestionResponse, SuggestionChoices, SuggestionUsage
from services.suggestion_service import SuggestionService

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
            mock_completion_text="      return x*2\n"
            elapsed_time=time.perf_counter() - start_time
            latency_ms=round(elapsed_time * 1000, 2)

            return GetSuggestionResponse(
                id=f"sug_{uuid.uuid4()}",
                model="starcoder2-7b-fim",
                choices=[
                    SuggestionChoices(
                        index=0,
                        insert_text=mock_completion_text,
                        finish_reason="stop",
                        score=0.92
                    )
                ],
                usage=SuggestionUsage(
                    prompt_tokens=45,
                    completion_tokens=8,
                    total_tokens=53
                ),
                latency_ms=latency_ms
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference engine failure: {str(e)}"
            )