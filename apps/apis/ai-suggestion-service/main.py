from fastapi import FastAPI

app = FastAPI(
    title="LCArena API",
    version="0.1.0",
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "LCArena API"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}