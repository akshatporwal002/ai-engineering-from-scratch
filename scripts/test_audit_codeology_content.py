#!/usr/bin/env python3
"""Tests for Codeology v1 schemas and cross-content publishing invariants."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import audit_codeology_content as audit


SOURCE = {"type": "codeology", "license": "MIT"}


class CodeologyContentAuditTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.content_root = Path(self.temporary.name) / "content" / "codeology"
        self.paths = self._write_valid_content()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, directory: str, filename: str, data: dict) -> Path:
        path = self.content_root / directory / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        return path

    def load_json(self, path: Path) -> dict:
        return json.loads(path.read_text(encoding="utf-8"))

    def rewrite_json(self, path: Path, data: dict) -> None:
        path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    def _write_valid_content(self) -> dict[str, Path]:
        skill_one = self.write_json(
            "skills",
            "service-debugging.v1.json",
            {
                "schemaVersion": 1,
                "skillId": "service.debugging",
                "skillVersion": 1,
                "title": "Service debugging",
                "definition": "Diagnose a failing service using reproducible observations and constrained changes.",
                "category": "service-reliability",
                "status": "published",
                "evidenceExpectations": ["Connect a reproducible failure to a justified code change."],
                "source": SOURCE,
            },
        )
        skill_two = self.write_json(
            "skills",
            "automated-testing.v1.json",
            {
                "schemaVersion": 1,
                "skillId": "service.automated-testing",
                "skillVersion": 1,
                "title": "Automated testing",
                "definition": "Design focused tests that distinguish the intended behavior from nearby regressions.",
                "category": "service-reliability",
                "status": "published",
                "evidenceExpectations": ["Add a test that fails before the repair and passes after it."],
                "source": SOURCE,
            },
        )
        research_note = self.content_root / "research" / "sources" / "practitioner-summary.md"
        research_note.parent.mkdir(parents=True, exist_ok=True)
        research_note.write_text("# Anonymized practitioner summary\n", encoding="utf-8")
        job_task_analysis = self.write_json(
            "job-task-analyses",
            "service-engineering.v1.json",
            {
                "schemaVersion": 1,
                "analysisId": "service-engineering",
                "analysisVersion": 1,
                "status": "published",
                "targetRole": {
                    "title": "Software engineer working on services",
                    "careerStage": "early-career",
                    "scope": "Maintains and extends production-style services within an established engineering team.",
                },
                "methodology": {
                    "researchStartedOn": "2026-07-01",
                    "researchCompletedOn": "2026-07-31",
                    "samplingApproach": "Triangulated public occupation data with a structured practitioner interview summary.",
                    "participantPrivacy": {
                        "publicRecordContainsPersonalData": False,
                        "handling": "Only anonymized, consented summaries are stored in the public research record.",
                        "retention": "Raw interview material follows a separate documented retention and deletion process.",
                    },
                    "limitations": ["The fixture represents a narrow regional and organizational sample."],
                },
                "evidenceSources": [
                    {
                        "sourceId": "occupation-data",
                        "kind": "official-occupation-data",
                        "title": "Public occupation task data",
                        "reference": "https://example.com/occupation-data",
                        "accessedOn": "2026-07-03",
                        "notes": "Used to identify recurring service maintenance and testing responsibilities.",
                    },
                    {
                        "sourceId": "practitioner-summary",
                        "kind": "practitioner-interview",
                        "title": "Anonymized practitioner interview summary",
                        "reference": "research/sources/practitioner-summary.md",
                        "accessedOn": "2026-07-12",
                        "notes": "Used to check entry-level context, observable outcomes, and realistic constraints.",
                    },
                ],
                "tasks": [
                    {
                        "taskId": "diagnose-service-regression",
                        "statement": "Diagnose and repair a regression in an inherited service without broad unrelated changes.",
                        "context": "A monitored endpoint has begun failing after a recent change in an established codebase.",
                        "observableOutcomes": [
                            "A reproducible failure is connected to a constrained repair and focused regression test."
                        ],
                        "evidenceSourceIds": ["occupation-data", "practitioner-summary"],
                        "importance": "high",
                        "frequency": "regular",
                        "entryRelevance": "core",
                        "reviewStatus": "approved",
                    }
                ],
                "reviewers": [
                    {
                        "reviewerId": "engineer-reviewer",
                        "perspective": "software-engineer",
                        "decision": "approve",
                        "reviewedTaskIds": ["diagnose-service-regression"],
                        "notes": "The task reflects bounded maintenance work in an inherited service.",
                    },
                    {
                        "reviewerId": "hiring-reviewer",
                        "perspective": "hiring-manager",
                        "decision": "approve",
                        "reviewedTaskIds": ["diagnose-service-regression"],
                        "notes": "The resulting artifact can expose relevant early-career engineering evidence.",
                    },
                    {
                        "reviewerId": "assessment-reviewer",
                        "perspective": "assessment-specialist",
                        "decision": "approve",
                        "reviewedTaskIds": ["diagnose-service-regression"],
                        "notes": "The task has observable outcomes without prescribing one implementation.",
                    },
                ],
                "synthesis": {
                    "inScopeTaskIds": ["diagnose-service-regression"],
                    "excludedTaskIds": [],
                    "selectionRationale": "The task is frequent, consequential, observable in a repository, and realistic for the target career stage.",
                },
                "source": SOURCE,
            },
        )
        pathway = self.write_json(
            "pathways",
            "service-engineering.v1.json",
            {
                "schemaVersion": 1,
                "pathwayId": "service-engineering",
                "pathwayVersion": 1,
                "title": "Service engineering",
                "summary": "A role-grounded route through maintaining and extending production-style services.",
                "status": "published",
                "targetRole": {
                    "title": "Software engineer working on services",
                    "jobTaskAnalysisRef": {"analysisId": "service-engineering", "analysisVersion": 1},
                },
                "assessmentBlueprintRef": {"blueprintId": "service-engineering", "blueprintVersion": 1},
                "skillRefs": [
                    {"skillId": "service.debugging", "skillVersion": 1},
                    {"skillId": "service.automated-testing", "skillVersion": 1},
                ],
                "prerequisiteEdges": [
                    {
                        "fromSkillId": "service.debugging",
                        "toSkillId": "service.automated-testing",
                        "kind": "prerequisite",
                    }
                ],
                "scenarioRefs": [{"scenarioId": "service/fix-regression", "scenarioVersion": 1}],
                "source": SOURCE,
            },
        )
        rubric = self.write_json(
            "rubrics",
            "fix-regression.v1.json",
            {
                "schemaVersion": 1,
                "rubricId": "service/fix-regression",
                "rubricVersion": 1,
                "scenarioRef": {"scenarioId": "service/fix-regression", "scenarioVersion": 1},
                "title": "Fix a service regression",
                "status": "published",
                "levels": [
                    {"id": "insufficient", "anchor": "Required evidence is absent or contradicts the criterion."},
                    {"id": "developing", "anchor": "Some relevant evidence exists, with material gaps remaining."},
                    {"id": "competent", "anchor": "The evidence satisfies the criterion in the stated context."},
                    {"id": "strong", "anchor": "The evidence is robust and addresses important adjacent risks."},
                ],
                "criteria": [
                    {
                        "criterionId": "reproduces-failure",
                        "title": "Reproduces the failure",
                        "kind": "hard-reject",
                        "description": "The submission contains a repeatable observation of the reported regression.",
                        "observableEvidence": ["A focused failing test or deterministic reproduction command."],
                        "hardRejectCondition": "No repeatable failure is established for the submitted commit.",
                        "skillRefs": [{"skillId": "service.debugging", "skillVersion": 1}],
                    },
                    {
                        "criterionId": "protects-behavior",
                        "title": "Protects the repaired behavior",
                        "kind": "quality",
                        "description": "Focused tests protect the repair without overspecifying unrelated implementation details.",
                        "observableEvidence": ["Tests distinguish the regression from valid neighboring behavior."],
                        "skillRefs": [{"skillId": "service.automated-testing", "skillVersion": 1}],
                    },
                ],
                "source": SOURCE,
            },
        )
        scenario = self.write_json(
            "scenarios",
            "fix-regression.v1.json",
            {
                "schemaVersion": 1,
                "scenarioId": "service/fix-regression",
                "scenarioVersion": 1,
                "pathwayRef": {"pathwayId": "service-engineering", "pathwayVersion": 1},
                "title": "Fix a service regression",
                "summary": "Investigate a failing endpoint, make a constrained repair, and protect the behavior with tests.",
                "difficulty": "guided",
                "status": "published",
                "skillRefs": [
                    {"skillId": "service.debugging", "skillVersion": 1},
                    {"skillId": "service.automated-testing", "skillVersion": 1},
                ],
                "rubricRef": {"rubricId": "service/fix-regression", "rubricVersion": 1},
                "criterionMappings": [
                    {"criterionId": "reproduces-failure", "skillId": "service.debugging", "evidenceRole": "primary"},
                    {"criterionId": "protects-behavior", "skillId": "service.automated-testing", "evidenceRole": "primary"},
                ],
                "publicBrief": {
                    "briefPath": "brief.md",
                    "toolsPolicy": "open-tool",
                    "estimatedMinutes": 90,
                    "minimumHardware": "Any computer capable of running the documented local test command.",
                    "publicRepositoryAccommodation": "A staff-reviewed private transfer route is available when public work is unsafe.",
                },
                "submission": {
                    "mode": "learner-owned",
                    "publicRepositoryRequired": True,
                    "allowedLanguages": ["python"],
                    "requiredFiles": ["README.md"],
                    "maxRepositoryBytes": 20000000,
                },
                "publicChecks": [
                    {
                        "checkId": "public-tests",
                        "kind": "learner-test",
                        "description": "Run the published deterministic regression tests.",
                    }
                ],
                "assuranceCeiling": "repository-observed",
                "source": SOURCE,
            },
        )
        (scenario.parent / "brief.md").write_text("# Fix a service regression\n", encoding="utf-8")
        evidence = self.write_json(
            "evidence",
            "fix-regression.v1.json",
            {
                "schemaVersion": 1,
                "evidenceId": "attempt/example-001",
                "evidenceVersion": 1,
                "state": "practised",
                "artifactAssurance": "repository-observed",
                "identityAssurance": "unverified",
                "administrationMode": "self-directed",
                "submission": {
                    "repositoryId": 1234,
                    "commitSha": "a" * 40,
                    "treeSha": "b" * 40,
                    "subdirectory": "challenges/fix-regression",
                    "scenarioRef": {"scenarioId": "service/fix-regression", "scenarioVersion": 1},
                    "rubricRef": {"rubricId": "service/fix-regression", "rubricVersion": 1},
                },
                "checkResults": [
                    {
                        "checkId": "public-tests",
                        "outcome": "pass",
                        "controller": "learner",
                        "observation": "Learner-controlled workflow reported success.",
                    }
                ],
                "criterionResults": [
                    {
                        "criterionId": "reproduces-failure",
                        "decision": "pass",
                        "level": "competent",
                        "evidenceItems": [
                            {
                                "path": "tests/test_regression.py",
                                "blobSha": "c" * 40,
                                "startLine": 4,
                                "endLine": 12,
                                "observation": "The focused test records the reported failure mode.",
                            }
                        ],
                    }
                ],
                "skillEvidence": [
                    {
                        "skillRef": {"skillId": "service.debugging", "skillVersion": 1},
                        "criterionIds": ["reproduces-failure"],
                    }
                ],
                "policyRef": {"policyId": "codeology.assessment-charter", "policyVersion": 1},
                "source": SOURCE,
            },
        )
        assessment_blueprint = self.write_json(
            "assessment-blueprints",
            "service-engineering.v1.json",
            {
                "schemaVersion": 1,
                "blueprintId": "service-engineering",
                "blueprintVersion": 1,
                "status": "published",
                "title": "Service engineering pilot assessment blueprint",
                "pathwayRef": {"pathwayId": "service-engineering", "pathwayVersion": 1},
                "jobTaskAnalysisRef": {"analysisId": "service-engineering", "analysisVersion": 1},
                "mappings": [
                    {
                        "mappingId": "diagnose-regression-evidence",
                        "taskId": "diagnose-service-regression",
                        "scenarioRef": {"scenarioId": "service/fix-regression", "scenarioVersion": 1},
                        "rubricRef": {"rubricId": "service/fix-regression", "rubricVersion": 1},
                        "criterionIds": ["reproduces-failure", "protects-behavior"],
                        "skillRefs": [
                            {"skillId": "service.debugging", "skillVersion": 1},
                            {"skillId": "service.automated-testing", "skillVersion": 1},
                        ],
                        "evidenceRole": "primary",
                    }
                ],
                "reviewers": [
                    {
                        "reviewerId": "engineer-reviewer",
                        "perspective": "software-engineer",
                        "decision": "approve",
                        "reviewedMappingIds": ["diagnose-regression-evidence"],
                        "notes": "The mapping connects the job task to observable repository evidence.",
                    },
                    {
                        "reviewerId": "hiring-reviewer",
                        "perspective": "hiring-manager",
                        "decision": "approve",
                        "reviewedMappingIds": ["diagnose-regression-evidence"],
                        "notes": "The mapped evidence is interpretable without an opaque aggregate score.",
                    },
                    {
                        "reviewerId": "assessment-reviewer",
                        "perspective": "assessment-specialist",
                        "decision": "approve",
                        "reviewedMappingIds": ["diagnose-regression-evidence"],
                        "notes": "The criteria provide direct coverage without implying mastery percentages.",
                    },
                ],
                "limitations": [
                    "One scenario provides initial coverage but cannot establish durable competency by itself."
                ],
                "source": SOURCE,
            },
        )
        return {
            "assessment_blueprint": assessment_blueprint,
            "job_task_analysis": job_task_analysis,
            "skill_one": skill_one,
            "skill_two": skill_two,
            "pathway": pathway,
            "rubric": rubric,
            "scenario": scenario,
            "evidence": evidence,
        }

    def audit(self) -> list[str]:
        return audit.audit_repository(self.content_root, audit.SCHEMA_ROOT)

    def test_valid_connected_content_passes(self) -> None:
        self.assertEqual(self.audit(), [])

    def test_prerequisite_cycle_is_rejected(self) -> None:
        pathway = self.load_json(self.paths["pathway"])
        pathway["prerequisiteEdges"].append(
            {
                "fromSkillId": "service.automated-testing",
                "toSkillId": "service.debugging",
                "kind": "prerequisite",
            }
        )
        self.rewrite_json(self.paths["pathway"], pathway)
        self.assertTrue(any("contains cycle" in error for error in self.audit()))

    def test_missing_skill_reference_is_rejected(self) -> None:
        self.paths["skill_two"].unlink()
        errors = self.audit()
        self.assertTrue(any("missing skill" in error for error in errors), errors)

    def test_published_pathway_requires_job_task_evidence(self) -> None:
        analysis = self.load_json(self.paths["job_task_analysis"])
        analysis["status"] = "draft"
        self.rewrite_json(self.paths["job_task_analysis"], analysis)
        errors = self.audit()
        self.assertTrue(any("require a published job-task analysis" in error for error in errors), errors)

    def test_job_task_must_cite_existing_research_source(self) -> None:
        analysis = self.load_json(self.paths["job_task_analysis"])
        analysis["tasks"][0]["evidenceSourceIds"].append("missing-source")
        self.rewrite_json(self.paths["job_task_analysis"], analysis)
        errors = self.audit()
        self.assertTrue(any("references missing evidence sources" in error for error in errors), errors)

    def test_published_analysis_requires_all_reviewer_perspectives(self) -> None:
        analysis = self.load_json(self.paths["job_task_analysis"])
        analysis["reviewers"] = [
            reviewer for reviewer in analysis["reviewers"] if reviewer["perspective"] != "assessment-specialist"
        ]
        self.rewrite_json(self.paths["job_task_analysis"], analysis)
        errors = self.audit()
        self.assertTrue(any("'assessment-specialist' approval" in error for error in errors), errors)

    def test_public_research_record_cannot_declare_personal_data(self) -> None:
        analysis = self.load_json(self.paths["job_task_analysis"])
        analysis["methodology"]["participantPrivacy"]["publicRecordContainsPersonalData"] = True
        self.rewrite_json(self.paths["job_task_analysis"], analysis)
        errors = self.audit()
        self.assertTrue(any("publicRecordContainsPersonalData" in error and "must equal False" in error for error in errors), errors)

    def test_published_pathway_requires_assessment_blueprint(self) -> None:
        pathway = self.load_json(self.paths["pathway"])
        del pathway["assessmentBlueprintRef"]
        self.rewrite_json(self.paths["pathway"], pathway)
        errors = self.audit()
        self.assertTrue(any("require an assessmentBlueprintRef" in error for error in errors), errors)

    def test_blueprint_skill_coverage_must_match_rubric_criteria(self) -> None:
        blueprint = self.load_json(self.paths["assessment_blueprint"])
        blueprint["mappings"][0]["skillRefs"] = [{"skillId": "service.debugging", "skillVersion": 1}]
        self.rewrite_json(self.paths["assessment_blueprint"], blueprint)
        errors = self.audit()
        self.assertTrue(any("skill coverage drifts from its rubric criteria" in error for error in errors), errors)

    def test_blueprint_mapping_must_use_in_scope_job_task(self) -> None:
        blueprint = self.load_json(self.paths["assessment_blueprint"])
        blueprint["mappings"][0]["taskId"] = "invented-task"
        self.rewrite_json(self.paths["assessment_blueprint"], blueprint)
        errors = self.audit()
        self.assertTrue(any("outside the JTA in-scope set" in error for error in errors), errors)

    def test_published_blueprint_requires_all_reviewer_perspectives(self) -> None:
        blueprint = self.load_json(self.paths["assessment_blueprint"])
        blueprint["reviewers"] = [
            reviewer for reviewer in blueprint["reviewers"] if reviewer["perspective"] != "hiring-manager"
        ]
        self.rewrite_json(self.paths["assessment_blueprint"], blueprint)
        errors = self.audit()
        self.assertTrue(any("'hiring-manager' approval" in error for error in errors), errors)

    def test_blueprint_rejects_mastery_percentage_shortcut(self) -> None:
        blueprint = self.load_json(self.paths["assessment_blueprint"])
        blueprint["mappings"][0]["masteryPercentage"] = 80
        self.rewrite_json(self.paths["assessment_blueprint"], blueprint)
        errors = self.audit()
        self.assertTrue(any("masteryPercentage" in error and "unknown property" in error for error in errors), errors)

    def test_scenario_and_rubric_mapping_drift_is_rejected(self) -> None:
        scenario = self.load_json(self.paths["scenario"])
        scenario["criterionMappings"][1]["skillId"] = "service.debugging"
        self.rewrite_json(self.paths["scenario"], scenario)
        errors = self.audit()
        self.assertTrue(any("drift from the rubric" in error for error in errors), errors)

    def test_assessor_only_field_is_rejected_from_public_content(self) -> None:
        scenario = self.load_json(self.paths["scenario"])
        scenario["hiddenTests"] = ["private/test_answer.py"]
        self.rewrite_json(self.paths["scenario"], scenario)
        errors = self.audit()
        self.assertTrue(any("assessor-only key" in error for error in errors), errors)

    def test_verified_state_requires_controlled_follow_up(self) -> None:
        evidence = self.load_json(self.paths["evidence"])
        evidence["state"] = "verified"
        self.rewrite_json(self.paths["evidence"], evidence)
        errors = self.audit()
        self.assertTrue(any("requires at least 'controlled-follow-up'" in error for error in errors), errors)

    def test_evidence_cannot_exceed_scenario_assurance_ceiling(self) -> None:
        evidence = self.load_json(self.paths["evidence"])
        evidence["artifactAssurance"] = "commit-bound-reviewed"
        self.rewrite_json(self.paths["evidence"], evidence)
        errors = self.audit()
        self.assertTrue(any("exceeds the scenario ceiling" in error for error in errors), errors)

    def test_unsafe_brief_path_is_rejected(self) -> None:
        scenario = self.load_json(self.paths["scenario"])
        scenario["publicBrief"]["briefPath"] = "../brief.md"
        self.rewrite_json(self.paths["scenario"], scenario)
        errors = self.audit()
        self.assertTrue(any("safe relative path" in error for error in errors), errors)

    def test_unsafe_evidence_repository_path_is_rejected(self) -> None:
        evidence = self.load_json(self.paths["evidence"])
        evidence["submission"]["subdirectory"] = "../another-attempt"
        self.rewrite_json(self.paths["evidence"], evidence)
        errors = self.audit()
        self.assertTrue(any("submission subdirectory" in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
