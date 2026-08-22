from datetime import UTC, datetime, timedelta
import json
from pathlib import Path
import unittest
from uuid import UUID

from app.domain.models import AnswerState, LessonProgress, ProgressState
from app.repositories.memory import MemoryRepositories
from app.services.progress import merge_answers, merge_lesson, reconcile_progress


BASE = datetime(2026, 1, 1, tzinfo=UTC)
PATH = "phases/01-math-foundations/08-optimization"


def lesson(*, completed=False, changed=None, visited=None, answer=0, answered=None):
    return LessonProgress(lesson_path=PATH, completed=completed, completion_changed_at=changed, visited_at=visited, answers={"q1": AnswerState(value=answer, answered_at=answered)})


class ProgressTests(unittest.IsolatedAsyncioTestCase):
    def test_language_neutral_fixtures_match_python(self):
        fixture = json.loads((Path(__file__).parents[1] / "fixtures/progress-merge.json").read_text())
        for item in fixture["cases"]:
            self.assertEqual(merge_lesson(LessonProgress.model_validate(item["local"]), LessonProgress.model_validate(item["remote"])), LessonProgress.model_validate(item["expected"]), item["name"])
    def test_latest_answer_wins_and_missing_timestamp_does_not_override(self):
        result = merge_answers(lesson(answer=1, answered=BASE).answers, lesson(answer=2, answered=BASE + timedelta(seconds=1)).answers)
        self.assertEqual(result["q1"].value, 2)
        self.assertEqual(merge_answers(lesson(answer=1, answered=BASE).answers, lesson(answer=2).answers)["q1"].value, 1)

    def test_clock_tie_is_deterministically_local(self):
        self.assertEqual(merge_answers(lesson(answer=1, answered=BASE).answers, lesson(answer=2, answered=BASE).answers)["q1"].value, 1)

    def test_completion_uses_latest_change_and_latest_visit(self):
        result = merge_lesson(lesson(completed=True, changed=BASE, visited=BASE + timedelta(seconds=2)), lesson(completed=False, changed=BASE + timedelta(seconds=1), visited=BASE))
        self.assertFalse(result.completed)
        self.assertEqual(result.visited_at, BASE + timedelta(seconds=2))

    async def test_reconcile_handles_local_remote_and_is_idempotent(self):
        repository, user = MemoryRepositories(), UUID(int=1)
        await repository.replace_progress(user, [lesson(answer=1, answered=BASE)])
        state = ProgressState(lessons=[lesson(answer=2, answered=BASE + timedelta(seconds=1))])
        first = await reconcile_progress(repository, user, state)
        second = await reconcile_progress(repository, user, first)
        self.assertEqual(first, second)

    async def test_reconcile_handles_anonymous_only_and_remote_only(self):
        repository, user = MemoryRepositories(), UUID(int=1)
        local = ProgressState(lessons=[lesson()])
        self.assertEqual(await reconcile_progress(repository, user, local), local)
        remote_user = UUID(int=2)
        await repository.replace_progress(remote_user, [lesson(completed=True, changed=BASE)])
        result = await reconcile_progress(repository, remote_user, ProgressState())
        self.assertTrue(result.lessons[0].completed)


if __name__ == "__main__":
    unittest.main()
