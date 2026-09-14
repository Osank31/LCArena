from fastapi import FastAPI, APIRouter, Depends, Request
from controllers.suggestion_controller import SuggestionController
from schemas.suggestion_schema import GetSuggestionRequest, GetSuggestionResponse
from services.suggestion_service import SuggestionService
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="LCArena API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_suggestion_controller(

) -> SuggestionController:
    service = SuggestionService()

    return SuggestionController(service)


router = APIRouter(prefix="/suggestions")


@router.post("", response_model=GetSuggestionResponse)
async def get_suggestion(
    request: Request,
    data: GetSuggestionRequest,
    controller: SuggestionController = Depends(get_suggestion_controller),
):
    response = await controller.get_suggestion(data, request)
    return response

app.include_router(router)