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
                    "jobTaskAnalysisStatus": "complete",
                    "evidenceRefs": ["docs/research/service-engineering-job-task-analysis.md"],
                },
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
        return {
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
        pathway = self.load_json(self.paths["pathway"])
        pathway["targetRole"] = {
            "title": "Software engineer working on services",
            "jobTaskAnalysisStatus": "pending",
            "evidenceRefs": [],
        }
        self.rewrite_json(self.paths["pathway"], pathway)
        errors = self.audit()
        self.assertTrue(any("completed, cited job-task analysis" in error for error in errors), errors)

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
