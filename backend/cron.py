import asyncio
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import uuid

from database import db
from utils import MONITORING_SHIFTS, send_telegram_message, create_notification
import logging

logger = logging.getLogger(__name__)

# ============ SCHEDULE NOTIFICATION CRON JOB ============
# UTC+8 timezone for local time comparisons
LOCAL_TZ = timezone(timedelta(hours=8))
async def schedule_notification_cron_job():
    """Background job that runs every minute to check for upcoming/ending activities."""
    try:
        now = datetime.now(LOCAL_TZ)
        logging.info(f"[CRON] Schedule notification check at {now.isoformat()}")
        # ---- 1. Notify 1 hour before start ----
        window_start_55 = now + timedelta(minutes=55)
        window_start_65 = now + timedelta(minutes=65)
        schedules_starting = await db.schedules.find({
            "notified_1h_before_start": {"$ne": True},
            "start_date": {
                "$gte": window_start_55.isoformat(),
                "$lte": window_start_65.isoformat()
            }
        }, {"_id": 0}).to_list(500)
        for schedule in schedules_starting:
            # ATOMIC CLAIM: Only one worker should handle this schedule
            claim_result = await db.schedules.update_one(
                {
                    "id": schedule["id"],
                    "notified_1h_before_start": {"$ne": True}
                },
                {"$set": {"notified_1h_before_start": True}}
            )
            
            if claim_result.modified_count == 0:
                continue # Already claimed/notified by another worker instance
 
            site_name = schedule.get("site_name", "Unknown")
            title = schedule.get("title", "")
            user_id = schedule["user_id"]
            notif_message = f"Ada jadwal mendatang *{title}* di *{site_name}* dalam 1 jam mendatang. Jangan lupa bersiap!"
            await create_notification(
                user_id=user_id,
                title="⏰ Jadwal Mendatang",
                message=notif_message,
                notification_type="schedule_reminder",
                related_id=schedule["id"]
            )
            logging.info(f"[CRON] Sent 1h-before-start notification for schedule {schedule['id']} to user {user_id}")
        # ---- 2. Notify 30 minutes before end ----
        window_end_25 = now + timedelta(minutes=25)
        window_end_35 = now + timedelta(minutes=35)
        schedules_ending = await db.schedules.find({
            "notified_30m_before_end": {"$ne": True},
            "end_date": {
                "$gte": window_end_25.isoformat(),
                "$lte": window_end_35.isoformat()
            }
        }, {"_id": 0}).to_list(500)
        for schedule in schedules_ending:
            # ATOMIC CLAIM: Only one worker should handle this schedule
            claim_result = await db.schedules.update_one(
                {
                    "id": schedule["id"],
                    "notified_30m_before_end": {"$ne": True}
                },
                {"$set": {"notified_30m_before_end": True}}
            )
 
            if claim_result.modified_count == 0:
                continue # Already claimed/notified by another worker instance
 
            site_name = schedule.get("site_name", "Unknown")
            end_date_str = schedule.get("end_date", "")
            user_id = schedule["user_id"]
            # Format end time for display
            try:
                end_dt = datetime.fromisoformat(end_date_str)
                end_time_display = end_dt.strftime("%H:%M")
            except (ValueError, TypeError):
                end_time_display = end_date_str
            notif_message = f"30 menit lagi aktivitas di *{site_name}* akan berakhir. Sistem akan melakukan finish secara otomatis pada jam *{end_time_display}*."
            await create_notification(
                user_id=user_id,
                title="⚠️ Aktivitas Akan Berakhir",
                message=notif_message,
                notification_type="schedule_ending",
                related_id=schedule["id"]
            )
            logging.info(f"[CRON] Sent 30m-before-end notification for schedule {schedule['id']} to user {user_id}")
        # ---- 3. Auto-Finish / Auto-Expire ----
        schedules_past_end = await db.schedules.find({
            "auto_finished": {"$ne": True},
            "end_date": {
                "$lte": now.isoformat()
            }
        }, {"_id": 0}).to_list(500)
        for schedule in schedules_past_end:
            schedule_id = schedule["id"]
            
            # ATOMIC CLAIM: Only one worker should handle the auto-finish for this schedule
            claim_result = await db.schedules.update_one(
                {
                    "id": schedule_id,
                    "auto_finished": {"$ne": True}
                },
                {"$set": {"auto_finished": True}}
            )
            
            if claim_result.modified_count == 0:
                continue # Already processed by another worker instance
 
            user_id = schedule["user_id"]
            site_name = schedule.get("site_name", "Unknown")
            user_name = schedule.get("user_name", "System")
            division = schedule.get("division", "")
            # Get the latest activity for this schedule
            latest_activity = await db.activities.find_one(
                {"schedule_id": schedule_id},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
            current_status = latest_activity["status"] if latest_activity else None
            auto_time = datetime.now(LOCAL_TZ)
            if current_status in ["In Progress", "On Hold"]:
                # Auto-finish: activity was started/on hold
                activity_doc = {
                    "id": str(uuid.uuid4()),
                    "schedule_id": schedule_id,
                    "user_id": user_id,
                    "user_name": user_name,
                    "division": division,
                    "action_type": "auto_finish",
                    "status": "Finished",
                    "notes": f"Otomatis diselesaikan oleh sistem pada {auto_time.strftime('%Y-%m-%d %H:%M:%S')}",
                    "reason": None,
                    "latitude": None,
                    "longitude": None,
                    "progress_updates": [],
                    "created_at": auto_time.isoformat(),
                    "updated_at": auto_time.isoformat()
                }
                await db.activities.insert_one(activity_doc)
                # Send confirmation notification
                notif_message = f"Aktivitas di *{site_name}* telah selesai otomatis oleh sistem."
                await create_notification(
                    user_id=user_id,
                    title="✅ Aktivitas Selesai Otomatis",
                    message=notif_message,
                    notification_type="auto_finish",
                    related_id=schedule_id
                )
                logging.info(f"[CRON] Auto-finished schedule {schedule_id} for user {user_id}")
            elif current_status is None:
                # Never started -> mark as Expired
                activity_doc = {
                    "id": str(uuid.uuid4()),
                    "schedule_id": schedule_id,
                    "user_id": user_id,
                    "user_name": user_name,
                    "division": division,
                    "action_type": "auto_expire",
                    "status": "Expired",
                    "notes": f"Jadwal tidak dimulai. Otomatis ditandai expired oleh sistem pada {auto_time.strftime('%Y-%m-%d %H:%M:%S')}",
                    "reason": None,
                    "latitude": None,
                    "longitude": None,
                    "progress_updates": [],
                    "created_at": auto_time.isoformat(),
                    "updated_at": auto_time.isoformat()
                }
                await db.activities.insert_one(activity_doc)
                notif_message = f"Jadwal di *{site_name}* telah ditandai *Expired* karena tidak dimulai."
                await create_notification(
                    user_id=user_id,
                    title="❌ Jadwal Expired",
                    message=notif_message,
                    notification_type="auto_expire",
                    related_id=schedule_id
                )
                logging.info(f"[CRON] Marked schedule {schedule_id} as Expired for user {user_id}")
        # ---- 4. Periodic Progress Fallback (Ghost Logs) ----
        # Find all In Progress activities to check for pings/heartbeats
        active_activities = await db.activities.find({
            "status": "In Progress"
        }, {"_id": 0}).to_list(500)
        
        for activity in active_activities:
            activity_id = activity["id"]
            updated_at_str = activity.get("updated_at")
            if not updated_at_str:
                continue
                
            try:
                last_update = datetime.fromisoformat(updated_at_str)
                # Ensure last_update is offset-aware for comparison
                if last_update.tzinfo is None:
                    last_update = last_update.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                continue
                
            # If no heartbeat for > 15 minutes, insert a ghost log
            # We use UTC comparison as updated_at is usually ISO UTC
            now_utc = datetime.now(timezone.utc)
            if (now_utc - last_update) > timedelta(minutes=15):
                # Check if this activity is still within its scheduled time
                schedule = await db.schedules.find_one({"id": activity["schedule_id"]}, {"_id": 0})
                if schedule and schedule.get("end_date"):
                    try:
                        end_dt = datetime.fromisoformat(schedule["end_date"])
                        if end_dt.tzinfo is None:
                            end_dt = end_dt.replace(tzinfo=timezone.utc)
                        
                        if now_utc > end_dt:
                            # Too late for ghost logs, let auto-finish handle it
                            continue
                    except (ValueError, TypeError):
                        pass
 
                ghost_update = {
                    "timestamp": now_utc.isoformat(),
                    "update_text": "Sedang proses pengerjaan (System Generated - Page Closed)",
                    "user_name": activity["user_name"],
                    "latitude": None,
                    "longitude": None,
                    "is_auto": True
                }
                
                await db.activities.update_one(
                    {"id": activity_id},
                    {
                        "$push": {"progress_updates": ghost_update},
                        "$set": {"updated_at": now_utc.isoformat()}
                    }
                )
                logging.info(f"[CRON] Inserted server-side fallback log for activity {activity_id}")
    except Exception as e:
        logging.error(f"[CRON] Error in schedule notification cron job: {e}")
 
TICKET_NOTIFICATION_CHAT_ID = "-5124203401" # Hardcoded group ID
 
async def ticket_notification_cron_job():
    """Background job that runs every minute to check for open tickets and notify via Telegram periodically."""
    try:
        now = datetime.now(timezone.utc)
        # Find tickets that are NOT closed
        open_tickets = await db.tickets.find({
            "status": {"$ne": "Closed"}
        }).to_list(1000)
        
        # SOFTCODED SETTINGS
        settings = await db.settings.find_one({"id": "site_settings"})
        chat_id = settings.get("ticket_notification_chat_id") if settings else None
        notification_interval = settings.get("ticket_notification_interval", 60) if settings else 60
        allowed_categories = settings.get("ticket_notification_categories", []) if settings else []
        
        # Fallback to hardcoded if not configured in DB
        if not chat_id:
            chat_id = TICKET_NOTIFICATION_CHAT_ID

        if not chat_id:
            return
 
        for ticket in open_tickets:
            # NEW: Filter by category if enabled categories are defined
            # If allowed_categories is empty, we notify for all (default behavior)
            if allowed_categories and ticket.get("category") not in allowed_categories:
                continue
            created_at_val = ticket.get("created_at")
            if not created_at_val:
                continue
                
            # Convert to datetime if string (ISO format)
            if isinstance(created_at_val, str):
                try:
                    # Handle Z suffix for UTC
                    iso_str = created_at_val.replace('Z', '+00:00')
                    created_at = datetime.fromisoformat(iso_str)
                except ValueError:
                    logging.error(f"[CRON] Invalid created_at format for ticket {ticket.get('id')}: {created_at_val}")
                    continue
            else:
                created_at = created_at_val
                
            # Ensure timezone awareness
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
                
            elapsed_minutes = int((now - created_at).total_seconds() / 60)
            last_notified = ticket.get("last_telegram_notified_minute")
            
            # Use configurable interval
            if last_notified is None:
                should_notify = elapsed_minutes >= notification_interval
            else:
                should_notify = (elapsed_minutes - last_notified) >= notification_interval
            
            if should_notify:
                try:
                    ticket_id = ticket.get("id")
                    
                    # ATOMIC CLAIM
                    if last_notified is None:
                        claim_filter = {
                            "id": ticket_id,
                            "last_telegram_notified_minute": {"$exists": False}
                        }
                    else:
                        claim_filter = {
                            "id": ticket_id,
                            "last_telegram_notified_minute": last_notified
                        }
                    
                    claim_result = await db.tickets.update_one(
                        claim_filter,
                        {"$set": {"last_telegram_notified_minute": elapsed_minutes}}
                    )
                    
                    if claim_result.modified_count == 0:
                        if last_notified is None:
                            claim_result = await db.tickets.update_one(
                                {
                                    "id": ticket_id,
                                    "last_telegram_notified_minute": None
                                },
                                {"$set": {"last_telegram_notified_minute": elapsed_minutes}}
                            )
                        if claim_result.modified_count == 0:
                            continue # Already notified by another worker
                    
                    # GUARD: Re-verify ticket still exists
                    fresh_ticket = await db.tickets.find_one({"id": ticket_id})
                    if not fresh_ticket:
                        logging.info(f"[CRON] Ticket {ticket_id} no longer exists. Skipping notification.")
                        continue
                    
                    ticket_no = fresh_ticket.get("ticket_number", "No Ticket Number")
                    site_name = fresh_ticket.get("site_name", "Unknown Site")
                    category = fresh_ticket.get("category", "General")
                    elapsed_hours = elapsed_minutes // 60
                    
                    # Fetch latest comment
                    comments = fresh_ticket.get("comments", [])
                    latest_comment = comments[-1].get("comment", "-") if comments else "-"
                    
                    # Web link for the ticket
                    ticket_link = f"https://vlux.varnion.net.id/tickets/{ticket_id}"
                    
                    message = f"{ticket_no}\n"
                    if fresh_ticket.get("link"):
                        message += f"{fresh_ticket.get('link')}\n"
                    message += (
                        f"\nSite :  {site_name}\n"
                        f"Issue: {category}\n"
                        f"Uptime: {elapsed_hours} hours\n"
                        f"Latest Comment: {latest_comment}\n\n"
                        f"Mohon ditindak lanjuti issue berikut.\n"
                        f"{ticket_link}"
                    )
                    
                    await send_telegram_message(chat_id, message)
                    logging.info(f"[CRON] Successfully notified Telegram for Ticket ID: {ticket_id} ({ticket_no})")
                except Exception as e:
                    logging.error(f"[CRON] Failed to send notification for ticket {ticket.get('id')}: {e}")
                    
    except Exception as e:
        logging.error(f"[CRON] Error in ticket notification cron job: {e}")
# ============ FIBERZONE SCHEDULE CRON JOB ============
async def fiberzone_schedule_cron_job():
    """Background job for Fiberzone schedules: 1-hour notification and auto-finish.
    NO ghost logs or periodic updates — simplified by design."""
    try:
        now = datetime.now(LOCAL_TZ)
        logging.info(f"[CRON:FZ] Fiberzone schedule check at {now.isoformat()}")

        # ---- 1. Notify 1 hour before start (Telegram + in-app) ----
        window_start_55 = now + timedelta(minutes=55)
        window_start_65 = now + timedelta(minutes=65)

        fz_starting = await db.fiberzone_schedules.find({
            "notified_1h_before": {"$ne": True},
            "start_time": {
                "$gte": window_start_55.isoformat(),
                "$lte": window_start_65.isoformat()
            }
        }, {"_id": 0}).to_list(500)

        for sched in fz_starting:
            # Atomic claim
            claim = await db.fiberzone_schedules.update_one(
                {"id": sched["id"], "notified_1h_before": {"$ne": True}},
                {"$set": {"notified_1h_before": True}}
            )
            if claim.modified_count == 0:
                continue

            site_name = sched.get("site_name", "Unknown")
            user_id = sched["user_id"]
            title = sched.get("title", "")

            # In-app notification
            notif_message = f"Ada jadwal Fiberzone *{title}* di *{site_name}* dalam 1 jam mendatang."
            await create_notification(
                user_id=user_id,
                title="⏰ Jadwal Fiberzone Mendatang",
                message=notif_message,
                notification_type="fiberzone_schedule_reminder",
                related_id=sched["id"]
            )

            # Telegram to fiberzone group chat
            settings = await db.settings.find_one({"id": "site_settings"})
            fz_chat_id = settings.get("fiberzone_notification_chat_id") if settings else None
            if fz_chat_id:
                tg_message = f"Ada jadwal Fiberzone di {site_name} dalam 1 jam mendatang.\n📋 {title}\n👤 {sched.get('user_name', '')}"
                await send_telegram_message(fz_chat_id, tg_message)

            logging.info(f"[CRON:FZ] Sent 1h notification for fiberzone schedule {sched['id']}")

        # ---- 2. Auto-Finish: update status to Finished when end_time has passed ----
        fz_past_end = await db.fiberzone_schedules.find({
            "auto_finished": {"$ne": True},
            "end_time": {"$lte": now.isoformat()}
        }, {"_id": 0}).to_list(500)

        for sched in fz_past_end:
            claim = await db.fiberzone_schedules.update_one(
                {"id": sched["id"], "auto_finished": {"$ne": True}},
                {"$set": {"auto_finished": True, "status": "Finished"}}
            )
            if claim.modified_count == 0:
                continue

            user_id = sched["user_id"]
            site_name = sched.get("site_name", "Unknown")

            await create_notification(
                user_id=user_id,
                title="✅ Jadwal Fiberzone Selesai",
                message=f"Jadwal di *{site_name}* telah selesai otomatis oleh sistem.",
                notification_type="fiberzone_auto_finish",
                related_id=sched["id"]
            )
            logging.info(f"[CRON:FZ] Auto-finished fiberzone schedule {sched['id']}")

    except Exception as e:
        logging.error(f"[CRON:FZ] Error in fiberzone schedule cron job: {e}")

# ============ SCHEDULER INSTANCE ============
_scheduler = None
async def start_scheduler():
    """Start APScheduler on app startup."""
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        schedule_notification_cron_job,
        IntervalTrigger(seconds=60),
        id="schedule_notification_cron",
        name="Schedule Notification & Auto-Finish Cron",
        replace_existing=True
    )
    _scheduler.add_job(
        ticket_notification_cron_job,
        IntervalTrigger(seconds=60),
        id="ticket_notification_cron",
        name="Recurring Ticket Telegram Notification",
        replace_existing=True
    )
    _scheduler.add_job(
        fiberzone_schedule_cron_job,
        IntervalTrigger(seconds=60),
        id="fiberzone_schedule_cron",
        name="Fiberzone Schedule Notification & Auto-Finish",
        replace_existing=True
    )
    _scheduler.start()
    logging.info("[CRON] All cron jobs started (runs every 60 seconds)")
async def stop_scheduler():
    """Stop APScheduler on app shutdown."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        logging.info("[CRON] All cron jobs stopped")
