from datetime import datetime, date, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def get_current_time() -> datetime:
    """Return the current naive datetime in Indian Standard Time (IST)."""
    return datetime.now(IST).replace(tzinfo=None)

def get_current_date() -> date:
    """Return the current date in Indian Standard Time (IST)."""
    return datetime.now(IST).date()
