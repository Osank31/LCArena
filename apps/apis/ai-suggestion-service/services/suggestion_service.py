from typing import List
from pydantic import BaseModel

from schemas.suggestion_schema import GetSuggestionRequest, GetSuggestionResponse, SuggestionUsage, SuggestionChoices
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()


class LLMSuggestionResponse(BaseModel):
    choices: List[SuggestionChoices]


class SuggestionService:
    def __init__(self):
        model = ChatAnthropic(
            model_name="claude-sonnet-4-5-20250929",
            timeout=10,
        )
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are an intelligent code completion engine running inside an IDE.

        Your job is to predict the code that should be inserted at the current cursor position.

        You are given:
        - prefix: code immediately before the cursor
        - suffix: code immediately after the cursor
        - language_id: programming language
        - editor_info: editor information

        Rules:
        1. Generate only code that should be inserted at the cursor.
        2. Do not provide explanations or conversational text.
        3. Do not use Markdown code fences.
        4. Do not repeat code already present in the prefix.
        5. Do not repeat code already present in the suffix.
        6. Carefully use the suffix to determine what belongs at the cursor.
        7. Preserve syntax, indentation, formatting, naming conventions, and coding style.
        8. Generate valid code for the specified language.
        9. Prefer the smallest useful completion.
        10. Complete partially written statements, expressions, calls, conditions,
           loops, declarations, and other constructs when appropriate.
        11. Do not modify existing code outside the cursor position.
        12. Do not invent APIs, variables, functions, libraries, or types unless
           strongly implied by the surrounding code.
        13. If there is insufficient context, return an empty choices list.
        14. Generate multiple candidates only when genuinely different completions
           are reasonable.
        15. Rank candidates from most likely to least likely.
        """
            ),
            (
                "human",
                """Programming language: {language_id}
        Editor: {editor_info}

        Code immediately before cursor:
        --- PREFIX ---
        {prefix}
        --- END PREFIX ---

        Code immediately after cursor:
        --- SUFFIX ---
        {suffix}
        --- END SUFFIX ---

        Generate the most appropriate code completion."""
            ),
        ])

        structured_llm = model.with_structured_output(
            LLMSuggestionResponse,
            include_raw=True
        )

        self.chain = prompt | structured_llm

    def get_suggestion(self, data: GetSuggestionRequest) -> GetSuggestionResponse:
        # Placeholder for actual implementation
        # This method would contain the logic to generate a suggestion based on the input data
        temp=data.model_dump()
        result=(self.chain.invoke(temp))

        return GetSuggestionResponse(
            id=result["raw"].response_metadata['id'],
            model=result["raw"].response_metadata['model_name'],
            choices=result["parsed"].choices,
            usage=SuggestionUsage(
                prompt_tokens=result["raw"].usage_metadata['input_tokens'],
                completion_tokens=result["raw"].usage_metadata['output_tokens'],
                total_tokens=result["raw"].usage_metadata['total_tokens']
            ),
            latency_ms=0.0
        )
