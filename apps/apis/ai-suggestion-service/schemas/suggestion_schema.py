from typing import Literal, List, Optional
from pydantic import BaseModel, Field

class CursorPosition(BaseModel):
    row: int = Field(ge=0, description="0-indexed line/row number")
    col: int = Field(ge=0, description="0-indexed character/column number")

class GetSuggestionRequest(BaseModel):
    prefix: str = Field(..., description="Code immediately before the cursor")
    suffix: str = Field(..., description="Code immediately after the cursor")

    # 3. Use Literal instead of inline Enum for simple string choices
    language_id: Literal['python', 'javascript', 'cpp', 'java']

    # 4. Use the nested model instead of a raw Tuple
    cursor_position: CursorPosition

    editor_info: str = Field(default="unknown", description="Client IDE and version (e.g., 'vscode-1.85')")

class TextReplacementRange(BaseModel):
    start_row: int = Field(..., ge=0, description="Starting row index for replacing text")
    start_col: int = Field(..., ge=0, description="Starting column index for replacing text")
    end_row: int = Field(..., ge=0, description="Ending row index for replacing text")
    end_col: int = Field(..., ge=0, description="Ending column index for replacing text")

class SuggestionChoices(BaseModel):
    index: int = Field(..., ge=0, description="Ordering index of the suggestion alternative")
    insert_text: str = Field(..., description="The generated completion/code snippet")
    finish_reason: Literal["stop", "length", "model_length", "cancelled"] = Field(
        default="stop",
        description="Reason generation terminated"
    )
    range: Optional[TextReplacementRange] = Field(
        default=None,
        description="Explicit range to replace in the editor. If None, insert at cursor."
    )
    score: float = Field(..., ge=0, le=1, description="Score of confidence")

class SuggestionUsage(BaseModel):
    prompt_tokens: int = Field(..., ge=0, description="Tokens consumed by prefix, suffix, and context")
    completion_tokens: int = Field(..., ge=0, description="Tokens generated in suggestions")
    total_tokens: int = Field(..., ge=0, description="Total tokens used for the request")

class GetSuggestionResponse(BaseModel):
    id: str = Field(..., description="Unique UUID for tracing and telemetry")
    model: str = Field(..., description="Model identifier used for inference")

    choices: List[SuggestionChoices] = Field(
        default_factory=list,
        description="List of candidate suggestions returned to the IDE"
    )

    usage: Optional[SuggestionUsage] = Field(
        default=None,
        description="Token consumption metadata for billing or quota tracking"
    )
    latency_ms: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Inference and processing latency in milliseconds"
    )
