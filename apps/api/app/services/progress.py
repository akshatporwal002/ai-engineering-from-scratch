"""Timestamp-based progress reconciliation matching the browser contract."""

from datetime import datetime
from uuid import UUID

from app.domain.models import AnswerState, LessonProgress, ProgressState
from app.repositories.memory import MemoryRepositories


def _latest(left: datetime | None, right: datetime | None) -> datetime | None:
    return max((value for value in (left, right) if value is not None), default=None)


def merge_answers(local: dict[str, AnswerState], remote: dict[str, AnswerState]) -> dict[str, AnswerState]:
    result: dict[str, AnswerState] = {}
    for key in sorted(set(local) | set(remote)):
        left, right = local.get(key), remote.get(key)
        if left is None or (right is not None and right.answered_at is not None and (left.answered_at is None or right.answered_at > left.answered_at)):
            result[key] = right.model_copy(deep=True)  # type: ignore[union-attr]
        else:
            result[key] = left.model_copy(deep=True)
    return result


def merge_lesson(local: LessonProgress, remote: LessonProgress) -> LessonProgress:
    left_stamp, right_stamp = local.completion_changed_at, remote.completion_changed_at
    completed = remote.completed if right_stamp is not None and (left_stamp is None or right_stamp > left_stamp) else local.completed
    return LessonProgress(lesson_path=local.lesson_path, answers=merge_answers(local.answers, remote.answers), completed=completed, completion_changed_at=_latest(left_stamp, right_stamp), visited_at=_latest(local.visited_at, remote.visited_at))


async def reconcile_progress(repository: MemoryRepositories, user_id: UUID, client_state: ProgressState) -> ProgressState:
    remote = {row.lesson_path: row for row in await repository.list_progress(user_id)}
    local = {row.lesson_path: row for row in client_state.lessons}
    merged = [merge_lesson(local[path], remote[path]) if path in local and path in remote else (local.get(path) or remote[path]).model_copy(deep=True) for path in sorted(set(local) | set(remote))]
    await repository.replace_progress(user_id, merged)
    return ProgressState(lessons=merged)
