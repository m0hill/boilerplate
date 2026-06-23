#!/bin/bash
set -euo pipefail

python3 - <<'PY'
from __future__ import annotations

import re
from pathlib import Path

root = Path("src")
production_files = [
    path
    for path in sorted(root.rglob("*.ts")) + sorted(root.rglob("*.tsx"))
    if not path.name.endswith(".test.ts")
    and not path.name.endswith(".test.tsx")
    and not path.name.endswith(".e2e.ts")
    and not path.name.endswith(".e2e.tsx")
    and "src/client" not in path.as_posix()
    and path.name not in {"test-utils.ts", "test-env.d.ts"}
]

texts = {path: path.read_text() for path in production_files}
combined = "\n".join(texts.values())

# Broad, intentionally transparent audit signals. These are not correctness
# checks; they are reminders to move real production code toward the Effect
# patterns documented in the vendored Effect examples.
data_tagged_error = combined.count("Data.TaggedError")

# Functions that manufacture Effect.gen inline are harder to trace and compose
# than named Effect.fn functions. Constant route effects are not counted.
effect_gen_factory_pattern = re.compile(
    r"(?:export\s+)?const\s+[a-z][A-Za-z0-9]*\s*=\s*(?:\([^=]*?\)|[A-Za-z_$][\w$]*)\s*=>\s*Effect\.gen",
    re.S,
)
effect_gen_factories = sum(len(effect_gen_factory_pattern.findall(text)) for text in texts.values())

# Exported effectful helpers should generally be named Effect.fn functions or
# service methods so traces and dependencies are explicit.
untraced_effect_export_pattern = re.compile(
    r"export\s+const\s+[a-z][A-Za-z0-9]*\s*=\s*(?!\s*Effect\.fn\b)(?:.|\n){0,180}?Effect\.(?:gen|all|try|tryPromise|succeed|fail)",
    re.S,
)
untraced_effect_exports = sum(len(untraced_effect_export_pattern.findall(text)) for text in texts.values())

# Route handlers and domain helpers should not directly pull platform services.
# Service/layer modules are the expected place to integrate HttpClient, KV, D1,
# and other adapters, so Context.Service modules are excluded from this count.
direct_platform_dependencies = sum(
    text.count("HttpClient.HttpClient") + text.count("CloudflareEnv")
    for path, text in texts.items()
    if path.as_posix() not in {"src/server.tsx", "src/cloudflare-env.ts"}
    and "Context.Service" not in text
)

effect_fn_calls = combined.count("Effect.fn(") + combined.count("Effect.fnUntraced(")
service_classes = combined.count("Context.Service")
src_lines = sum(text.count("\n") + 1 for text in texts.values())

# Phase 1 score: coarse Effect anti-patterns. Kept as a secondary guard now
# that it has reached zero.
effect_audit_score = (
    data_tagged_error * 2
    + effect_gen_factories * 3
    + untraced_effect_exports * 2
    + direct_platform_dependencies * 4
)

# Phase 2 score: route modules should read as product workflows, not repeated
# protocol-adapter ceremony. Datastar/Web response wrapping belongs in the
# shared HTTP boundary, and route effects should be named for traces.
route_combined = "\n".join(
    text for text in texts.values() if "HttpRouter.add" in text or "homeRoutes" in text or "counterRoutes" in text
)
raw_datastar_wrappers = route_combined.count("HttpServerResponse.raw(")
route_effect_constants = len(
    re.findall(r"const\s+[a-z][A-Za-z0-9]*\s*=\s*Effect\.gen\(function\*", route_combined)
)
route_noise_score = raw_datastar_wrappers * 2 + route_effect_constants

# Phase 3 score: expected failures should carry structured context rather
# than stringly-typed reason blobs such as `status_500`.
string_reason_errors = len(
    re.findall(r"class\s+[A-Za-z0-9]+Error[\s\S]{0,260}?reason:\s*Schema\.String", combined)
)
status_string_reasons = combined.count("status_${")
error_model_score = string_reason_errors * 2 + status_string_reasons

# Phase 4 score: exported domain records should come from schemas/classes when
# they cross module boundaries, so runtime validation and static types share one
# source of truth.
plain_exported_domain_types = len(re.findall(r"export\s+type\s+[A-Z][A-Za-z0-9]*\s*=\s*\{", combined))
domain_schema_score = plain_exported_domain_types

# Phase 5 score: contributor docs should describe the current helper/service
# boundaries, not the pre-cleanup raw Datastar wrapping pattern.
doc_paths = [Path("AGENTS.md"), Path("AGENTS.d/project.md"), Path("README.md")]
docs_combined = "\n".join(path.read_text() for path in doc_paths if path.exists())
stale_datastar_docs = docs_combined.count("Wrap datastar-kit responses with `HttpServerResponse.raw") + docs_combined.count(
    "route handlers return `HttpServerResponse.raw"
)
docs_staleness_score = stale_datastar_docs

binding_docs_paths = doc_paths + [Path("src/cloudflare-env.ts")]
binding_docs_combined = "\n".join(path.read_text() for path in binding_docs_paths if path.exists())
stale_binding_docs = binding_docs_combined.count("const { COUNTER_KV } = yield* CloudflareEnv") + binding_docs_combined.count(
    "`store.ts` wraps `COUNTER_KV` in Effects"
) + binding_docs_combined.count("handler(request, Context.make(CloudflareEnv, env))")
binding_docs_staleness_score = stale_binding_docs

domain_modules = [Path("src/pages/home/repo-name.ts"), Path("src/pages/home/compare-board.ts")]
missing_domain_tests = sum(1 for path in domain_modules if path.exists() and not path.with_name(f"{path.stem}.test.ts").exists())
domain_test_gap_score = missing_domain_tests

test_combined = "\n".join(path.read_text() for path in sorted(root.rglob("*.test.ts")))
duplicated_load_app_helpers = test_combined.count("const loadApp = async")
test_helper_duplication_score = duplicated_load_app_helpers

metrics = {
    "test_helper_duplication_score": test_helper_duplication_score,
    "duplicated_load_app_helpers": duplicated_load_app_helpers,
    "domain_test_gap_score": domain_test_gap_score,
    "missing_domain_tests": missing_domain_tests,
    "binding_docs_staleness_score": binding_docs_staleness_score,
    "stale_binding_docs": stale_binding_docs,
    "docs_staleness_score": docs_staleness_score,
    "stale_datastar_docs": stale_datastar_docs,
    "domain_schema_score": domain_schema_score,
    "plain_exported_domain_types": plain_exported_domain_types,
    "error_model_score": error_model_score,
    "string_reason_errors": string_reason_errors,
    "status_string_reasons": status_string_reasons,
    "route_noise_score": route_noise_score,
    "raw_datastar_wrappers": raw_datastar_wrappers,
    "route_effect_constants": route_effect_constants,
    "effect_audit_score": effect_audit_score,
    "data_tagged_error": data_tagged_error,
    "effect_gen_factories": effect_gen_factories,
    "untraced_effect_exports": untraced_effect_exports,
    "direct_platform_dependencies": direct_platform_dependencies,
    "effect_fn_calls": effect_fn_calls,
    "service_classes": service_classes,
    "src_lines": src_lines,
}

for name, value in metrics.items():
    print(f"METRIC {name}={value}")
PY
