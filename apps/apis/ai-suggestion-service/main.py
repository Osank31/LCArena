from fastapi import FastAPI, APIRouter, Depends
from controllers.suggestion_controller import SuggestionController
from schemas.suggestion_schema import GetSuggestionRequest, GetSuggestionResponse
from services.suggestion_service import SuggestionService

app = FastAPI(
    title="LCArena API",
    version="0.1.0",
)

def get_suggestion_controller(

) -> SuggestionController:
    service = SuggestionService()

    return SuggestionController(service)


router = APIRouter(prefix="/suggestions")


@router.get(
    "",
    response_model=GetSuggestionResponse
)
async def  get_suggestion(data: GetSuggestionRequest, controller: SuggestionController = Depends(get_suggestion_controller)):
    response = await controller.get_suggestion(data)
    return response

app.include_router(router)