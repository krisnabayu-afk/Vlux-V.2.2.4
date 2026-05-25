import os
import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

from database import client, UPLOAD_DIR
from cron import start_scheduler, stop_scheduler
from routers import auth, sites, categories, users, holidays, schedules, activities, reports, tickets, notifications, dashboard, starlinks, misc, departments, ttb, documentation, work_orders, fiberzone, settings, projects, permissions, summary_presets, divisions, organization, migrations

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up APScheduler...")
    await start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down database client and scheduler...")
    client.close()
    await stop_scheduler()

app = FastAPI(title="Flux Backend API", lifespan=lifespan)

# Mount uploads directory for static access
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Set up CORS
allowed_origins = [origin.strip() for origin in os.environ.get('ALLOWED_ORIGINS', '').split(',') if origin.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]  # Safe defaults
    
logger.info(f"CORS Allowed Origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router, prefix="/api")
app.include_router(sites.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(holidays.router, prefix="/api")
app.include_router(schedules.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(starlinks.router, prefix="/api")
app.include_router(misc.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(ttb.router, prefix="/api")
app.include_router(documentation.router, prefix="/api")
app.include_router(work_orders.router, prefix="/api")
app.include_router(fiberzone.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(permissions.router, prefix="/api")
app.include_router(summary_presets.router, prefix="/api")
app.include_router(divisions.router, prefix="/api")  # NEW: Dynamic divisions management
app.include_router(organization.router, prefix="/api/organization")  # NEW: Organization configuration
app.include_router(migrations.router, prefix="/api")  # NEW: Migration helpers

# End of app configuration

if __name__ == "__main__":
    import uvicorn
    # Change port to 3002 to match deployment environment requirements
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)