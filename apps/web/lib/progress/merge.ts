import type { LessonProgress, ProgressAnswer } from "../api/generated";

const later = (left: string | null, right: string | null) => !right ? left : !left || right > left ? right : left;

export function mergeAnswers(local: Record<string, ProgressAnswer>, remote: Record<string, ProgressAnswer>) {
  return Object.fromEntries([...new Set([...Object.keys(local), ...Object.keys(remote)])].sort().map((key) => {
    const left = local[key]; const right = remote[key];
    return [key, !left || (right && right.answered_at && (!left.answered_at || right.answered_at > left.answered_at)) ? structuredClone(right) : structuredClone(left)];
  }));
}

export function mergeLesson(local: LessonProgress, remote: LessonProgress): LessonProgress {
  const remoteWins = Boolean(remote.completion_changed_at && (!local.completion_changed_at || remote.completion_changed_at > local.completion_changed_at));
  return { lesson_path: local.lesson_path, answers: mergeAnswers(local.answers, remote.answers), completed: remoteWins ? remote.completed : local.completed, completion_changed_at: later(local.completion_changed_at, remote.completion_changed_at), visited_at: later(local.visited_at, remote.visited_at) };
}
