#!/usr/bin/env python3
"""Validate Codeology v1 schemas and cross-content publishing invariants."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = ROOT / "content" / "codeology"
SCHEMA_ROOT = CONTENT_ROOT / "schemas" / "v1"
SCHEMA_DRAFT = "https://json-schema.org/draft/2020-12/schema"
SCHEMA_IDS = {
    "common.schema.json": "https://codeology.dev/schemas/v1/common.schema.json",
    "assessment-blueprint.schema.json": "https://codeology.dev/schemas/v1/assessment-blueprint.schema.json",
    "job-task-analysis.schema.json": "https://codeology.dev/schemas/v1/job-task-analysis.schema.json",
    "pathway.schema.json": "https://codeology.dev/schemas/v1/pathway.schema.json",
    "skill.schema.json": "https://codeology.dev/schemas/v1/skill.schema.json",
    "scenario.schema.json": "https://codeology.dev/schemas/v1/scenario.schema.json",
    "rubric.schema.json": "https://codeology.dev/schemas/v1/rubric.schema.json",
    "evidence.schema.json": "https://codeology.dev/schemas/v1/evidence.schema.json",
}
ENTITY_CONTRACTS = {
    "assessment-blueprints": ("assessment-blueprint.schema.json", "blueprintId", "blueprintVersion"),
    "job-task-analyses": ("job-task-analysis.schema.json", "analysisId", "analysisVersion"),
    "pathways": ("pathway.schema.json", "pathwayId", "pathwayVersion"),
    "skills": ("skill.schema.json", "skillId", "skillVersion"),
    "scenarios": ("scenario.schema.json", "scenarioId", "scenarioVersion"),
    "rubrics": ("rubric.schema.json", "rubricId", "rubricVersion"),
    "evidence": ("evidence.schema.json", "evidenceId", "evidenceVersion"),
}
FORBIDDEN_PUBLIC_KEYS = {
    "hiddenTests",
    "privatePrompt",
    "graderPrompt",
    "calibrationAnswers",
    "escalationThresholds",
}
FORBIDDEN_PUBLIC_DIRECTORIES = {"assessor", "calibration", "hidden", "private"}
RUBRIC_LEVELS = ["insufficient", "developing", "competent", "strong"]
ASSURANCE_ORDER = [
    "learner-reported",
    "repository-observed",
    "commit-bound-reviewed",
    "independently-executed",
    "controlled-follow-up",
]
STATE_MINIMUM_ASSURANCE = {
    "learned": "learner-reported",
    "practised": "repository-observed",
    "demonstrated": "commit-bound-reviewed",
    "verified": "controlled-follow-up",
}


def display_path(path: Path, root: Path = ROOT) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def json_type_matches(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return False


class SchemaStore:
    def __init__(self, schema_root: Path) -> None:
        self.schema_root = schema_root
        self.schemas: dict[str, dict[str, Any]] = {}

    def load(self, filename: str) -> dict[str, Any]:
        if filename not in self.schemas:
            path = self.schema_root / filename
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                raise ValueError(f"{display_path(path)} must contain a JSON object")
            self.schemas[filename] = data
        return self.schemas[filename]

    def resolve(self, reference: str, current_filename: str) -> tuple[dict[str, Any], str]:
        filename, _, fragment = reference.partition("#")
        target_filename = filename or current_filename
        target: Any = self.load(target_filename)
        if fragment:
            if not fragment.startswith("/"):
                raise ValueError(f"unsupported schema fragment {reference!r}")
            for encoded_part in fragment[1:].split("/"):
                part = encoded_part.replace("~1", "/").replace("~0", "~")
                if not isinstance(target, dict) or part not in target:
                    raise ValueError(f"unresolvable schema reference {reference!r}")
                target = target[part]
        if not isinstance(target, dict):
            raise ValueError(f"schema reference {reference!r} did not resolve to an object")
        return target, target_filename


def validate_instance(
    instance: Any,
    schema: dict[str, Any],
    store: SchemaStore,
    schema_filename: str,
    where: str = "$",
) -> list[str]:
    errors: list[str] = []
    if "$ref" in schema:
        try:
            resolved, resolved_filename = store.resolve(str(schema["$ref"]), schema_filename)
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
            return [f"{where}: {exc}"]
        return validate_instance(instance, resolved, store, resolved_filename, where)

    if "const" in schema and instance != schema["const"]:
        errors.append(f"{where}: must equal {schema['const']!r}")
    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{where}: must be one of {schema['enum']!r}")

    expected_type = schema.get("type")
    if expected_type and not json_type_matches(instance, expected_type):
        return [f"{where}: must be {expected_type}"]

    if isinstance(instance, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in instance:
                errors.append(f"{where}: missing required property {key!r}")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in instance:
                if key not in properties:
                    errors.append(f"{where}: unknown property {key!r}")
        for key, child_schema in properties.items():
            if key in instance and isinstance(child_schema, dict):
                errors.extend(validate_instance(instance[key], child_schema, store, schema_filename, f"{where}.{key}"))

    if isinstance(instance, list):
        minimum = schema.get("minItems")
        maximum = schema.get("maxItems")
        if isinstance(minimum, int) and len(instance) < minimum:
            errors.append(f"{where}: must contain at least {minimum} item(s)")
        if isinstance(maximum, int) and len(instance) > maximum:
            errors.append(f"{where}: must contain at most {maximum} item(s)")
        if schema.get("uniqueItems") is True:
            encoded = [json.dumps(item, sort_keys=True, separators=(",", ":")) for item in instance]
            if len(encoded) != len(set(encoded)):
                errors.append(f"{where}: items must be unique")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(instance):
                errors.extend(validate_instance(item, item_schema, store, schema_filename, f"{where}[{index}]"))

    if isinstance(instance, str):
        minimum = schema.get("minLength")
        if isinstance(minimum, int) and len(instance) < minimum:
            errors.append(f"{where}: must contain at least {minimum} characters")
        pattern = schema.get("pattern")
        if isinstance(pattern, str) and re.fullmatch(pattern, instance) is None:
            errors.append(f"{where}: must match {pattern!r}")

    if isinstance(instance, int) and not isinstance(instance, bool):
        minimum = schema.get("minimum")
        if isinstance(minimum, int) and instance < minimum:
            errors.append(f"{where}: must be at least {minimum}")
    return errors


def walk_keys(value: Any) -> Iterable[str]:
    if isinstance(value, dict):
        for key, child in value.items():
            yield key
            yield from walk_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_keys(child)


def is_safe_relative_path(value: Any) -> bool:
    if not isinstance(value, str) or not value or value.startswith("/") or "\\" in value or ":" in value:
        return False
    if any(ord(character) < 32 for character in value):
        return False
    return all(part not in {"", ".", ".."} for part in value.split("/"))


def is_safe_research_reference(value: Any, content_root: Path) -> bool:
    if not isinstance(value, str):
        return False
    if value.startswith("https://"):
        parsed = urlsplit(value)
        return bool(parsed.netloc) and parsed.username is None and parsed.password is None
    if not is_safe_relative_path(value):
        return False
    candidate = (content_root / value).resolve()
    try:
        candidate.relative_to(content_root.resolve())
    except ValueError:
        return False
    return candidate.is_file()


def load_entities(content_root: Path, store: SchemaStore) -> tuple[dict[str, list[tuple[Path, dict[str, Any]]]], list[str]]:
    entities: dict[str, list[tuple[Path, dict[str, Any]]]] = defaultdict(list)
    errors: list[str] = []
    for directory, (schema_filename, _, _) in ENTITY_CONTRACTS.items():
        entity_root = content_root / directory
        if not entity_root.exists():
            continue
        for path in sorted(entity_root.rglob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                errors.append(f"{display_path(path)}: invalid JSON: {exc}")
                continue
            if not isinstance(data, dict):
                errors.append(f"{display_path(path)}: root must be an object")
                continue
            schema = store.load(schema_filename)
            for error in validate_instance(data, schema, store, schema_filename):
                errors.append(f"{display_path(path)}: {error}")
            forbidden = sorted(FORBIDDEN_PUBLIC_KEYS.intersection(walk_keys(data)))
            if forbidden:
                errors.append(f"{display_path(path)}: assessor-only key(s) are forbidden in public content: {forbidden!r}")
            entities[directory].append((path, data))
    return entities, errors


def index_entities(
    entities: dict[str, list[tuple[Path, dict[str, Any]]]]
) -> tuple[dict[str, dict[tuple[str, int], tuple[Path, dict[str, Any]]]], list[str]]:
    indexes: dict[str, dict[tuple[str, int], tuple[Path, dict[str, Any]]]] = {}
    errors: list[str] = []
    for directory, (_, id_field, version_field) in ENTITY_CONTRACTS.items():
        index: dict[tuple[str, int], tuple[Path, dict[str, Any]]] = {}
        seen_ids: dict[str, set[int]] = defaultdict(set)
        for path, data in entities.get(directory, []):
            entity_id = data.get(id_field)
            version = data.get(version_field)
            if not isinstance(entity_id, str) or not isinstance(version, int):
                continue
            key = (entity_id, version)
            if key in index:
                errors.append(
                    f"{display_path(path)}: duplicate {directory[:-1]} identity {entity_id!r} version {version}"
                )
            index[key] = (path, data)
            seen_ids[entity_id].add(version)
        for entity_id, versions in seen_ids.items():
            ordered = sorted(versions)
            if ordered != list(range(1, max(ordered) + 1)):
                errors.append(f"{directory}: versions for {entity_id!r} must be contiguous from 1, found {ordered!r}")
        indexes[directory] = index
    return indexes, errors


def find_cycle(nodes: set[str], edges: list[tuple[str, str]]) -> list[str]:
    adjacency: dict[str, list[str]] = defaultdict(list)
    for source, target in edges:
        adjacency[source].append(target)
    visiting: set[str] = set()
    visited: set[str] = set()
    trail: list[str] = []

    def visit(node: str) -> list[str]:
        if node in visiting:
            return trail[trail.index(node) :] + [node]
        if node in visited:
            return []
        visiting.add(node)
        trail.append(node)
        for target in adjacency[node]:
            cycle = visit(target)
            if cycle:
                return cycle
        trail.pop()
        visiting.remove(node)
        visited.add(node)
        return []

    for node in sorted(nodes):
        cycle = visit(node)
        if cycle:
            return cycle
    return []


def semantic_audit(
    content_root: Path,
    entities: dict[str, list[tuple[Path, dict[str, Any]]]],
    indexes: dict[str, dict[tuple[str, int], tuple[Path, dict[str, Any]]]],
) -> list[str]:
    errors: list[str] = []
    skill_index = indexes["skills"]
    analysis_index = indexes["job-task-analyses"]
    blueprint_index = indexes["assessment-blueprints"]
    pathway_index = indexes["pathways"]
    scenario_index = indexes["scenarios"]
    rubric_index = indexes["rubrics"]

    for path, analysis in entities.get("job-task-analyses", []):
        where = display_path(path)
        source_ids: set[str] = set()
        source_kinds: set[str] = set()
        for source in analysis.get("evidenceSources", []):
            if not isinstance(source, dict):
                continue
            source_id = source.get("sourceId")
            if source_id in source_ids:
                errors.append(f"{where}: duplicate evidence source {source_id!r}")
            if isinstance(source_id, str):
                source_ids.add(source_id)
            if isinstance(source.get("kind"), str):
                source_kinds.add(source["kind"])
            if not is_safe_research_reference(source.get("reference"), content_root):
                errors.append(f"{where}: evidence source {source_id!r} must use HTTPS or an existing safe public reference")

        task_ids: set[str] = set()
        task_statuses: dict[str, str] = {}
        for task in analysis.get("tasks", []):
            if not isinstance(task, dict):
                continue
            task_id = task.get("taskId")
            if task_id in task_ids:
                errors.append(f"{where}: duplicate taskId {task_id!r}")
            if isinstance(task_id, str):
                task_ids.add(task_id)
                task_statuses[task_id] = str(task.get("reviewStatus", ""))
            missing_sources = set(task.get("evidenceSourceIds", [])) - source_ids
            if missing_sources:
                errors.append(f"{where}: task {task_id!r} references missing evidence sources {sorted(missing_sources)!r}")

        reviewer_ids: set[str] = set()
        approving_coverage: dict[str, set[str]] = defaultdict(set)
        for reviewer in analysis.get("reviewers", []):
            if not isinstance(reviewer, dict):
                continue
            reviewer_id = reviewer.get("reviewerId")
            if reviewer_id in reviewer_ids:
                errors.append(f"{where}: duplicate reviewerId {reviewer_id!r}")
            if isinstance(reviewer_id, str):
                reviewer_ids.add(reviewer_id)
            reviewed = set(reviewer.get("reviewedTaskIds", []))
            missing_tasks = reviewed - task_ids
            if missing_tasks:
                errors.append(f"{where}: reviewer {reviewer_id!r} references missing tasks {sorted(missing_tasks)!r}")
            if reviewer.get("decision") == "approve" and isinstance(reviewer.get("perspective"), str):
                approving_coverage[reviewer["perspective"]].update(reviewed)

        synthesis = analysis.get("synthesis", {})
        in_scope = set(synthesis.get("inScopeTaskIds", [])) if isinstance(synthesis, dict) else set()
        excluded = set(synthesis.get("excludedTaskIds", [])) if isinstance(synthesis, dict) else set()
        if in_scope & excluded:
            errors.append(f"{where}: in-scope and excluded task sets must not overlap")
        if in_scope | excluded != task_ids:
            errors.append(f"{where}: synthesis must classify every task exactly once")
        for task_id in in_scope:
            if task_statuses.get(task_id) != "approved":
                errors.append(f"{where}: in-scope task {task_id!r} must have approved reviewStatus")
        for task_id in excluded:
            if task_statuses.get(task_id) != "excluded":
                errors.append(f"{where}: excluded task {task_id!r} must have excluded reviewStatus")

        methodology = analysis.get("methodology", {})
        if isinstance(methodology, dict):
            try:
                started = date.fromisoformat(str(methodology.get("researchStartedOn", "")))
                completed = date.fromisoformat(str(methodology.get("researchCompletedOn", "")))
                if started > completed:
                    errors.append(f"{where}: researchStartedOn cannot be after researchCompletedOn")
            except ValueError:
                pass

        if analysis.get("status") == "published":
            if len(source_kinds) < 2:
                errors.append(f"{where}: published analysis requires at least two evidence-source kinds")
            required_perspectives = {"software-engineer", "hiring-manager", "assessment-specialist"}
            for perspective in sorted(required_perspectives):
                if not in_scope.issubset(approving_coverage.get(perspective, set())):
                    errors.append(f"{where}: published analysis requires {perspective!r} approval of every in-scope task")

    for path, pathway in entities.get("pathways", []):
        where = display_path(path)
        skill_refs = pathway.get("skillRefs", [])
        skill_keys = {(ref.get("skillId"), ref.get("skillVersion")) for ref in skill_refs if isinstance(ref, dict)}
        skill_ids = {key[0] for key in skill_keys}
        for key in skill_keys:
            if key not in skill_index:
                errors.append(f"{where}: references missing skill {key[0]!r} version {key[1]!r}")
        edge_pairs: list[tuple[str, str]] = []
        for edge in pathway.get("prerequisiteEdges", []):
            if not isinstance(edge, dict):
                continue
            source, target = edge.get("fromSkillId"), edge.get("toSkillId")
            if source == target:
                errors.append(f"{where}: prerequisite edge cannot point {source!r} to itself")
            if source not in skill_ids or target not in skill_ids:
                errors.append(f"{where}: prerequisite edge {source!r} -> {target!r} must stay inside the pathway skill graph")
            if isinstance(source, str) and isinstance(target, str):
                edge_pairs.append((source, target))
        cycle = find_cycle({item for item in skill_ids if isinstance(item, str)}, edge_pairs)
        if cycle:
            errors.append(f"{where}: prerequisite graph contains cycle {' -> '.join(cycle)}")
        for ref in pathway.get("scenarioRefs", []):
            if isinstance(ref, dict):
                key = (ref.get("scenarioId"), ref.get("scenarioVersion"))
                if key not in scenario_index:
                    errors.append(f"{where}: references missing scenario {key[0]!r} version {key[1]!r}")
        target_role = pathway.get("targetRole", {})
        analysis_ref = target_role.get("jobTaskAnalysisRef", {}) if isinstance(target_role, dict) else {}
        analysis_key = (
            analysis_ref.get("analysisId"),
            analysis_ref.get("analysisVersion"),
        ) if isinstance(analysis_ref, dict) else (None, None)
        analysis_record = analysis_index.get(analysis_key)
        if not analysis_record:
            errors.append(f"{where}: references missing job-task analysis {analysis_key!r}")
        else:
            analysis_role = analysis_record[1].get("targetRole", {})
            if isinstance(target_role, dict) and isinstance(analysis_role, dict) and target_role.get("title") != analysis_role.get("title"):
                errors.append(f"{where}: target role title must match the referenced job-task analysis")
            if pathway.get("status") == "published" and analysis_record[1].get("status") != "published":
                errors.append(f"{where}: published pathways require a published job-task analysis")
        blueprint_ref = pathway.get("assessmentBlueprintRef")
        if pathway.get("status") == "published" and not isinstance(blueprint_ref, dict):
            errors.append(f"{where}: published pathways require an assessmentBlueprintRef")
        if isinstance(blueprint_ref, dict):
            blueprint_key = (blueprint_ref.get("blueprintId"), blueprint_ref.get("blueprintVersion"))
            blueprint_record = blueprint_index.get(blueprint_key)
            if not blueprint_record:
                errors.append(f"{where}: references missing assessment blueprint {blueprint_key!r}")
            else:
                expected_pathway_ref = {
                    "pathwayId": pathway.get("pathwayId"),
                    "pathwayVersion": pathway.get("pathwayVersion"),
                }
                if blueprint_record[1].get("pathwayRef") != expected_pathway_ref:
                    errors.append(f"{where}: pathway and assessment blueprint references are not reciprocal")
                if blueprint_record[1].get("jobTaskAnalysisRef") != analysis_ref:
                    errors.append(f"{where}: assessment blueprint must use the pathway's job-task analysis")
                if pathway.get("status") == "published" and blueprint_record[1].get("status") != "published":
                    errors.append(f"{where}: published pathways require a published assessment blueprint")

    for path, rubric in entities.get("rubrics", []):
        where = display_path(path)
        levels = [level.get("id") for level in rubric.get("levels", []) if isinstance(level, dict)]
        if levels != RUBRIC_LEVELS:
            errors.append(f"{where}: rubric levels must be ordered {RUBRIC_LEVELS!r}")
        criterion_ids: set[str] = set()
        scenario_ref = rubric.get("scenarioRef", {})
        scenario_key = (scenario_ref.get("scenarioId"), scenario_ref.get("scenarioVersion")) if isinstance(scenario_ref, dict) else (None, None)
        scenario_record = scenario_index.get(scenario_key)
        if not scenario_record:
            errors.append(f"{where}: references missing scenario {scenario_key[0]!r} version {scenario_key[1]!r}")
        for criterion in rubric.get("criteria", []):
            if not isinstance(criterion, dict):
                continue
            criterion_id = criterion.get("criterionId")
            if criterion_id in criterion_ids:
                errors.append(f"{where}: duplicate criterionId {criterion_id!r}")
            if isinstance(criterion_id, str):
                criterion_ids.add(criterion_id)
            condition = criterion.get("hardRejectCondition")
            if criterion.get("kind") == "hard-reject" and not condition:
                errors.append(f"{where}: hard-reject criterion {criterion_id!r} requires hardRejectCondition")
            if criterion.get("kind") == "quality" and condition:
                errors.append(f"{where}: quality criterion {criterion_id!r} cannot define hardRejectCondition")
            for ref in criterion.get("skillRefs", []):
                if isinstance(ref, dict):
                    key = (ref.get("skillId"), ref.get("skillVersion"))
                    if key not in skill_index:
                        errors.append(f"{where}: criterion {criterion_id!r} references missing skill {key!r}")
        if scenario_record:
            scenario = scenario_record[1]
            expected_ref = {"rubricId": rubric.get("rubricId"), "rubricVersion": rubric.get("rubricVersion")}
            if scenario.get("rubricRef") != expected_ref:
                errors.append(f"{where}: scenario and rubric references are not reciprocal")

    for path, scenario in entities.get("scenarios", []):
        where = display_path(path)
        pathway_ref = scenario.get("pathwayRef", {})
        pathway_key = (pathway_ref.get("pathwayId"), pathway_ref.get("pathwayVersion")) if isinstance(pathway_ref, dict) else (None, None)
        pathway_record = pathway_index.get(pathway_key)
        if not pathway_record:
            errors.append(f"{where}: references missing pathway {pathway_key[0]!r} version {pathway_key[1]!r}")
        else:
            scenario_key = (scenario.get("scenarioId"), scenario.get("scenarioVersion"))
            refs = {
                (ref.get("scenarioId"), ref.get("scenarioVersion"))
                for ref in pathway_record[1].get("scenarioRefs", [])
                if isinstance(ref, dict)
            }
            if scenario_key not in refs:
                errors.append(f"{where}: pathway does not reference this scenario version")
        scenario_skill_keys = {
            (ref.get("skillId"), ref.get("skillVersion"))
            for ref in scenario.get("skillRefs", [])
            if isinstance(ref, dict)
        }
        scenario_skill_ids = {key[0] for key in scenario_skill_keys}
        for key in scenario_skill_keys:
            if key not in skill_index:
                errors.append(f"{where}: references missing skill {key!r}")
        rubric_ref = scenario.get("rubricRef", {})
        rubric_key = (rubric_ref.get("rubricId"), rubric_ref.get("rubricVersion")) if isinstance(rubric_ref, dict) else (None, None)
        rubric_record = rubric_index.get(rubric_key)
        criterion_to_skills: dict[str, set[str]] = defaultdict(set)
        for mapping in scenario.get("criterionMappings", []):
            if not isinstance(mapping, dict):
                continue
            criterion_id, skill_id = mapping.get("criterionId"), mapping.get("skillId")
            if skill_id not in scenario_skill_ids:
                errors.append(f"{where}: criterion mapping references undeclared scenario skill {skill_id!r}")
            if isinstance(criterion_id, str) and isinstance(skill_id, str):
                if skill_id in criterion_to_skills[criterion_id]:
                    errors.append(f"{where}: duplicate mapping for criterion {criterion_id!r} and skill {skill_id!r}")
                criterion_to_skills[criterion_id].add(skill_id)
        if not rubric_record:
            errors.append(f"{where}: references missing rubric {rubric_key[0]!r} version {rubric_key[1]!r}")
        else:
            rubric = rubric_record[1]
            rubric_criteria = {
                criterion.get("criterionId"): {
                    ref.get("skillId") for ref in criterion.get("skillRefs", []) if isinstance(ref, dict)
                }
                for criterion in rubric.get("criteria", [])
                if isinstance(criterion, dict)
            }
            if set(criterion_to_skills) != set(rubric_criteria):
                errors.append(f"{where}: scenario mappings must cover every rubric criterion exactly")
            for criterion_id, mapped_skills in criterion_to_skills.items():
                if criterion_id in rubric_criteria and mapped_skills != rubric_criteria[criterion_id]:
                    errors.append(f"{where}: skill mappings for criterion {criterion_id!r} drift from the rubric")
        brief_path = scenario.get("publicBrief", {}).get("briefPath") if isinstance(scenario.get("publicBrief"), dict) else None
        if isinstance(brief_path, str):
            relative = Path(brief_path)
            candidate = (path.parent / relative).resolve()
            try:
                candidate.relative_to(content_root.resolve())
            except ValueError:
                errors.append(f"{where}: briefPath must remain inside content/codeology")
            else:
                if not is_safe_relative_path(brief_path):
                    errors.append(f"{where}: briefPath must be a safe relative path")
                elif not candidate.is_file():
                    errors.append(f"{where}: briefPath does not exist: {brief_path!r}")
        submission_contract = scenario.get("submission", {})
        if isinstance(submission_contract, dict):
            for required_file in submission_contract.get("requiredFiles", []):
                if not is_safe_relative_path(required_file):
                    errors.append(f"{where}: required file must be a safe repository-relative path: {required_file!r}")

    for path, evidence in entities.get("evidence", []):
        where = display_path(path)
        assurance = evidence.get("artifactAssurance")
        state = evidence.get("state")
        if assurance in ASSURANCE_ORDER and state in STATE_MINIMUM_ASSURANCE:
            if ASSURANCE_ORDER.index(assurance) < ASSURANCE_ORDER.index(STATE_MINIMUM_ASSURANCE[state]):
                errors.append(f"{where}: {state!r} requires at least {STATE_MINIMUM_ASSURANCE[state]!r} assurance")
        if state == "practised" and not evidence.get("checkResults"):
            errors.append(f"{where}: practised evidence requires at least one recorded check result")
        if state in {"demonstrated", "verified"} and (
            not evidence.get("criterionResults") or not evidence.get("skillEvidence")
        ):
            errors.append(f"{where}: {state!r} evidence requires criterion results and mapped skill evidence")
        if assurance in {"independently-executed", "controlled-follow-up"}:
            controlled_checks = [
                item
                for item in evidence.get("checkResults", [])
                if isinstance(item, dict) and item.get("controller") == "codeology"
            ]
            if not controlled_checks:
                errors.append(f"{where}: {assurance!r} assurance requires a Codeology-controlled check")
        if assurance == "controlled-follow-up" and evidence.get("administrationMode") == "self-directed":
            errors.append(f"{where}: controlled-follow-up assurance cannot be self-directed")
        submission = evidence.get("submission", {})
        if not isinstance(submission, dict):
            continue
        if not is_safe_relative_path(submission.get("subdirectory")):
            errors.append(f"{where}: submission subdirectory must be a safe repository-relative path")
        scenario_ref = submission.get("scenarioRef", {})
        rubric_ref = submission.get("rubricRef", {})
        scenario_key = (scenario_ref.get("scenarioId"), scenario_ref.get("scenarioVersion")) if isinstance(scenario_ref, dict) else (None, None)
        rubric_key = (rubric_ref.get("rubricId"), rubric_ref.get("rubricVersion")) if isinstance(rubric_ref, dict) else (None, None)
        scenario_record = scenario_index.get(scenario_key)
        rubric_record = rubric_index.get(rubric_key)
        if not scenario_record:
            errors.append(f"{where}: evidence references missing scenario {scenario_key!r}")
        elif assurance in ASSURANCE_ORDER:
            ceiling = scenario_record[1].get("assuranceCeiling")
            if ceiling in ASSURANCE_ORDER and ASSURANCE_ORDER.index(assurance) > ASSURANCE_ORDER.index(ceiling):
                errors.append(f"{where}: artifact assurance exceeds the scenario ceiling {ceiling!r}")
        if not rubric_record:
            errors.append(f"{where}: evidence references missing rubric {rubric_key!r}")
        if scenario_record and scenario_record[1].get("rubricRef") != rubric_ref:
            errors.append(f"{where}: evidence rubric does not match the scenario rubric")
        if rubric_record:
            criterion_ids = {
                item.get("criterionId") for item in rubric_record[1].get("criteria", []) if isinstance(item, dict)
            }
            result_ids = {
                item.get("criterionId") for item in evidence.get("criterionResults", []) if isinstance(item, dict)
            }
            if not result_ids.issubset(criterion_ids):
                errors.append(f"{where}: criterion results reference IDs outside the rubric")
            for item in evidence.get("skillEvidence", []):
                if not isinstance(item, dict):
                    continue
                ref = item.get("skillRef", {})
                key = (ref.get("skillId"), ref.get("skillVersion")) if isinstance(ref, dict) else (None, None)
                if key not in skill_index:
                    errors.append(f"{where}: skill evidence references missing skill {key!r}")
                if not set(item.get("criterionIds", [])).issubset(result_ids):
                    errors.append(f"{where}: skill evidence must reference recorded criterion results")
        for result in evidence.get("criterionResults", []):
            if not isinstance(result, dict):
                continue
            for item in result.get("evidenceItems", []):
                if isinstance(item, dict):
                    if not is_safe_relative_path(item.get("path")):
                        errors.append(f"{where}: evidence item path must be repository-relative and traversal-safe")
                    if item.get("startLine", 0) > item.get("endLine", 0):
                        errors.append(f"{where}: evidence line ranges must be ascending")

    for path, blueprint in entities.get("assessment-blueprints", []):
        where = display_path(path)
        pathway_ref = blueprint.get("pathwayRef", {})
        pathway_key = (
            pathway_ref.get("pathwayId"),
            pathway_ref.get("pathwayVersion"),
        ) if isinstance(pathway_ref, dict) else (None, None)
        pathway_record = pathway_index.get(pathway_key)
        analysis_ref = blueprint.get("jobTaskAnalysisRef", {})
        analysis_key = (
            analysis_ref.get("analysisId"),
            analysis_ref.get("analysisVersion"),
        ) if isinstance(analysis_ref, dict) else (None, None)
        analysis_record = analysis_index.get(analysis_key)
        if not pathway_record:
            errors.append(f"{where}: references missing pathway {pathway_key!r}")
        if not analysis_record:
            errors.append(f"{where}: references missing job-task analysis {analysis_key!r}")

        pathway_skill_keys = {
            (ref.get("skillId"), ref.get("skillVersion"))
            for ref in (pathway_record[1].get("skillRefs", []) if pathway_record else [])
            if isinstance(ref, dict)
        }
        in_scope_tasks = set(
            analysis_record[1].get("synthesis", {}).get("inScopeTaskIds", [])
            if analysis_record and isinstance(analysis_record[1].get("synthesis"), dict)
            else []
        )
        mapping_ids: set[str] = set()
        covered_tasks: set[str] = set()
        covered_skills: set[tuple[Any, Any]] = set()
        for mapping in blueprint.get("mappings", []):
            if not isinstance(mapping, dict):
                continue
            mapping_id = mapping.get("mappingId")
            if mapping_id in mapping_ids:
                errors.append(f"{where}: duplicate mappingId {mapping_id!r}")
            if isinstance(mapping_id, str):
                mapping_ids.add(mapping_id)
            task_id = mapping.get("taskId")
            if task_id not in in_scope_tasks:
                errors.append(f"{where}: mapping {mapping_id!r} references a task outside the JTA in-scope set")
            elif isinstance(task_id, str):
                covered_tasks.add(task_id)

            scenario_ref = mapping.get("scenarioRef", {})
            scenario_key = (
                scenario_ref.get("scenarioId"),
                scenario_ref.get("scenarioVersion"),
            ) if isinstance(scenario_ref, dict) else (None, None)
            scenario_record = scenario_index.get(scenario_key)
            rubric_ref = mapping.get("rubricRef", {})
            rubric_key = (
                rubric_ref.get("rubricId"),
                rubric_ref.get("rubricVersion"),
            ) if isinstance(rubric_ref, dict) else (None, None)
            rubric_record = rubric_index.get(rubric_key)
            if not scenario_record:
                errors.append(f"{where}: mapping {mapping_id!r} references missing scenario {scenario_key!r}")
            elif scenario_record[1].get("pathwayRef") != pathway_ref:
                errors.append(f"{where}: mapping {mapping_id!r} scenario belongs to a different pathway")
            if not rubric_record:
                errors.append(f"{where}: mapping {mapping_id!r} references missing rubric {rubric_key!r}")
            elif scenario_record and scenario_record[1].get("rubricRef") != rubric_ref:
                errors.append(f"{where}: mapping {mapping_id!r} rubric does not match the scenario")

            mapped_skill_keys = {
                (ref.get("skillId"), ref.get("skillVersion"))
                for ref in mapping.get("skillRefs", [])
                if isinstance(ref, dict)
            }
            covered_skills.update(mapped_skill_keys)
            if not mapped_skill_keys.issubset(pathway_skill_keys):
                errors.append(f"{where}: mapping {mapping_id!r} references skills outside the pathway")
            if scenario_record:
                scenario_skill_keys = {
                    (ref.get("skillId"), ref.get("skillVersion"))
                    for ref in scenario_record[1].get("skillRefs", [])
                    if isinstance(ref, dict)
                }
                if not mapped_skill_keys.issubset(scenario_skill_keys):
                    errors.append(f"{where}: mapping {mapping_id!r} references skills outside the scenario")
            if rubric_record:
                criterion_index = {
                    criterion.get("criterionId"): {
                        (ref.get("skillId"), ref.get("skillVersion"))
                        for ref in criterion.get("skillRefs", [])
                        if isinstance(ref, dict)
                    }
                    for criterion in rubric_record[1].get("criteria", [])
                    if isinstance(criterion, dict)
                }
                criterion_ids = set(mapping.get("criterionIds", []))
                missing_criteria = criterion_ids - set(criterion_index)
                if missing_criteria:
                    errors.append(f"{where}: mapping {mapping_id!r} references missing criteria {sorted(missing_criteria)!r}")
                expected_skill_keys: set[tuple[Any, Any]] = set()
                for criterion_id in criterion_ids:
                    expected_skill_keys.update(criterion_index.get(criterion_id, set()))
                if not missing_criteria and mapped_skill_keys != expected_skill_keys:
                    errors.append(f"{where}: mapping {mapping_id!r} skill coverage drifts from its rubric criteria")

        reviewer_ids: set[str] = set()
        approving_coverage: dict[str, set[str]] = defaultdict(set)
        for reviewer in blueprint.get("reviewers", []):
            if not isinstance(reviewer, dict):
                continue
            reviewer_id = reviewer.get("reviewerId")
            if reviewer_id in reviewer_ids:
                errors.append(f"{where}: duplicate reviewerId {reviewer_id!r}")
            if isinstance(reviewer_id, str):
                reviewer_ids.add(reviewer_id)
            reviewed = set(reviewer.get("reviewedMappingIds", []))
            missing_mappings = reviewed - mapping_ids
            if missing_mappings:
                errors.append(f"{where}: reviewer {reviewer_id!r} references missing mappings {sorted(missing_mappings)!r}")
            if reviewer.get("decision") == "approve" and isinstance(reviewer.get("perspective"), str):
                approving_coverage[reviewer["perspective"]].update(reviewed)

        if blueprint.get("status") == "published":
            if analysis_record and analysis_record[1].get("status") != "published":
                errors.append(f"{where}: published blueprint requires a published job-task analysis")
            if pathway_record and pathway_record[1].get("status") != "published":
                errors.append(f"{where}: published blueprint requires a published pathway")
            if covered_tasks != in_scope_tasks:
                errors.append(f"{where}: published blueprint must cover every in-scope job task")
            if covered_skills != pathway_skill_keys:
                errors.append(f"{where}: published blueprint must cover every pathway skill")
            required_perspectives = {"software-engineer", "hiring-manager", "assessment-specialist"}
            for perspective in sorted(required_perspectives):
                if not mapping_ids.issubset(approving_coverage.get(perspective, set())):
                    errors.append(f"{where}: published blueprint requires {perspective!r} approval of every mapping")
    return errors


def audit_schema_contracts(store: SchemaStore) -> list[str]:
    errors: list[str] = []
    actual = {path.name for path in SCHEMA_ROOT.glob("*.json")} if SCHEMA_ROOT.exists() else set()
    if actual != set(SCHEMA_IDS):
        errors.append(f"content/codeology/schemas/v1: expected schema files {sorted(SCHEMA_IDS)!r}, found {sorted(actual)!r}")
    for filename, schema_id in SCHEMA_IDS.items():
        try:
            schema = store.load(filename)
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
            errors.append(f"content/codeology/schemas/v1/{filename}: {exc}")
            continue
        if schema.get("$schema") != SCHEMA_DRAFT:
            errors.append(f"{filename}: must declare JSON Schema 2020-12")
        if schema.get("$id") != schema_id:
            errors.append(f"{filename}: $id must equal {schema_id!r}")
        if not isinstance(schema.get("title"), str) or not schema["title"].strip():
            errors.append(f"{filename}: title is required")
        if filename != "common.schema.json" and schema.get("additionalProperties") is not False:
            errors.append(f"{filename}: public entity schemas must reject unknown properties")
    return errors


def audit_public_boundaries(content_root: Path) -> list[str]:
    errors: list[str] = []
    if not content_root.exists():
        return [f"{display_path(content_root)}: content root is missing"]
    for path in content_root.rglob("*"):
        if path.is_dir() and path.name.lower() in FORBIDDEN_PUBLIC_DIRECTORIES:
            errors.append(f"{display_path(path)}: assessor-only directories cannot live under public content")
    return errors


def audit_repository(content_root: Path = CONTENT_ROOT, schema_root: Path = SCHEMA_ROOT) -> list[str]:
    store = SchemaStore(schema_root)
    errors = audit_schema_contracts(store) if schema_root == SCHEMA_ROOT else []
    errors.extend(audit_public_boundaries(content_root))
    try:
        entities, load_errors = load_entities(content_root, store)
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
        return errors + [f"schema loading failed: {exc}"]
    errors.extend(load_errors)
    indexes, index_errors = index_entities(entities)
    errors.extend(index_errors)
    errors.extend(semantic_audit(content_root, entities, indexes))
    return errors


def main() -> int:
    errors = audit_repository()
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    counts = []
    for directory in ENTITY_CONTRACTS:
        count = len(list((CONTENT_ROOT / directory).rglob("*.json"))) if (CONTENT_ROOT / directory).exists() else 0
        counts.append(f"{directory}={count}")
    print(f"Codeology v1 content schemas and publishing invariants are valid ({', '.join(counts)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
