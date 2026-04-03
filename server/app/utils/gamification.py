"""Gamification — rank tiers, streaks, and leaderboard utilities."""

from datetime import UTC, date, datetime

RANK_TIERS = [
    {"name": "Node", "icon": "💻", "min_gpu_hours": 0, "level": 1},
    {"name": "Cluster", "icon": "⚡", "min_gpu_hours": 50, "level": 2},
    {"name": "Datacenter", "icon": "🏢", "min_gpu_hours": 200, "level": 3},
    {"name": "Supercomputer", "icon": "🌩️", "min_gpu_hours": 1000, "level": 4},
    {"name": "Hyperscaler", "icon": "🌌", "min_gpu_hours": 5000, "level": 5},
]


def get_tier(total_gpu_hours: float) -> dict:
    """Get the contributor's rank tier based on total GPU hours."""
    for tier in reversed(RANK_TIERS):
        if total_gpu_hours >= tier["min_gpu_hours"]:
            return tier
    return RANK_TIERS[0]


def update_streak(
    current_streak: int,
    longest_streak: int,
    last_contribution_date: datetime | None,
) -> tuple[int, int, date]:
    """Update contribution streak. Returns (new_streak, new_longest, today)."""
    today = datetime.now(UTC).date()

    if last_contribution_date is None:
        return 1, max(longest_streak, 1), today

    last_date = last_contribution_date.date() if isinstance(last_contribution_date, datetime) else last_contribution_date

    if last_date == today:
        # Already contributed today, no change
        return current_streak, longest_streak, today
    elif (today - last_date).days == 1:
        # Consecutive day — extend streak
        new_streak = current_streak + 1
        return new_streak, max(longest_streak, new_streak), today
    else:
        # Streak broken — reset
        return 1, max(longest_streak, 1), today
