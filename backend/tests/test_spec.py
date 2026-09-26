from pathlib import Path

import pytest
from openapi_spec_validator import validate

from app.spec import SpecError, bundle, load_spec

ROOT = """
openapi: 3.1.0
info: {title: t, version: '1'}
paths:
  /ping:
    $ref: 'ping.yaml#/paths/ping'
"""

PING = """
paths:
  ping:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: '#/schemas/Pong'
schemas:
  Pong:
    type: object
    properties:
      error:
        $ref: 'common.yaml#/schemas/Error'
"""

COMMON = """
schemas:
  Error:
    type: string
"""


def write(directory: Path, **files: str) -> Path:
    for name, text in files.items():
        (directory / f"{name}.yaml").write_text(text, encoding="utf-8")
    return directory


def test_contract_bundles_into_valid_openapi():
    validate(load_spec())


def test_paths_are_inlined_and_schemas_moved_to_components(tmp_path):
    spec = bundle(write(tmp_path, openapi=ROOT, ping=PING, common=COMMON))

    response = spec["paths"]["/ping"]["get"]["responses"]["200"]
    assert response["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/Pong"
    }
    assert spec["components"]["schemas"] == {
        "Pong": {"type": "object", "properties": {"error": {"$ref": "#/components/schemas/Error"}}},
        "Error": {"type": "string"},
    }


def test_same_schema_name_in_two_files_is_rejected(tmp_path):
    ping = """
paths:
  ping:
    get:
      responses:
        '200':
          description: своя схема Pong
          content:
            application/json:
              schema:
                $ref: '#/schemas/Pong'
        '201':
          description: одноимённая схема из common.yaml
          content:
            application/json:
              schema:
                $ref: 'common.yaml#/schemas/Pong'
schemas:
  Pong:
    type: object
"""
    common = """
schemas:
  Pong:
    type: string
"""
    write(tmp_path, openapi=ROOT, ping=ping, common=common)

    with pytest.raises(SpecError, match="schemas/Pong объявлен и в ping.yaml, и в common.yaml"):
        bundle(tmp_path)


def test_unused_schema_is_rejected(tmp_path):
    write(tmp_path, openapi=ROOT, ping=PING, common=COMMON + "  Unused:\n    type: string\n")

    with pytest.raises(SpecError, match="common.yaml: schemas/Unused нигде не используется"):
        bundle(tmp_path)


def test_file_nobody_references_is_rejected(tmp_path):
    write(tmp_path, openapi=ROOT, ping=PING, common=COMMON, forgotten="schemas: {}\n")

    with pytest.raises(SpecError, match="никто не ссылается: forgotten.yaml"):
        bundle(tmp_path)
