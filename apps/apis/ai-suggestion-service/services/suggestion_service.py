class SuggestionService:
    def __init__(self):
        pass

    def get_suggestion(self, data: GetSuggestionRequest) -> GetSuggestionResponse:
        # Placeholder for actual implementation
        # This method would contain the logic to generate a suggestion based on the input data
        logger.info(f"Generating suggestion for prefix: {data.prefix} and suffix: {data.suffix}")
        return GetSuggestionResponse(
            id="",
            model="",
            choices=[],
            usage=SuggestionUsage(
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0
            ),
            latency_ms=0.0
        )