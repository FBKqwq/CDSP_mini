from datetime import datetime, timezone


def utcnow() -> datetime:
    """当前 UTC 时间，去掉时区信息。

    数据库 DATETIME 列约定统一按 UTC 存储，因此跨层传递的 datetime 均为
    无时区信息的 UTC 值。
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def as_aware_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc)


def to_epoch_ms(value: datetime) -> int:
    return int(as_aware_utc(value).timestamp() * 1000)
