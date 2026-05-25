from database import db

async def get_notifications(current_user: dict):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

async def mark_notification_read(notification_id: str, current_user: dict):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

async def mark_all_notifications_read(current_user: dict):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

async def get_unread_count(current_user: dict):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
    return {"count": count}
