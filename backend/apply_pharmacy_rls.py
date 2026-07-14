"""
apply_pharmacy_rls.py
──────────────────────
Automated script to retrofit pharmacy-scope RLS into all FastAPI endpoint files.

What it does per file:
1. Adds `from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope` import
2. Replaces the `TenantContext = Depends(get_tenant_context)` parameter pattern
   with `scope: PharmacyScope = Depends(get_pharmacy_scope)`
3. Replaces `tenant.tenant_id` / `ctx.tenant_id` references with `scope.tenant_id`
4. Replaces direct `Model.tenant_id == tenant.tenant_id` filter patterns
   with `scope.apply(query, Model)` where possible
5. Writes a diff summary to console

Run from backend/:
    python apply_pharmacy_rls.py [--dry-run]
"""

import os
import re
import sys
import io
import shutil
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DRY_RUN = "--dry-run" in sys.argv
ENDPOINTS_DIR = Path("api/v1/endpoints")
BACKUP_DIR = Path("api/v1/endpoints/_rls_backup")

if not DRY_RUN:
    BACKUP_DIR.mkdir(exist_ok=True)

IMPORT_LINE = "from core.pharmacy_scope import get_pharmacy_scope, PharmacyScope"

# ── transformation rules (ordered, applied sequentially) ────────────────────

IMPORT_REMOVALS = [
    # These imports are replaced by PharmacyScope
    r",\s*get_tenant_context",
    r",\s*TenantContext",
]

PARAM_REPLACEMENTS = [
    # Pattern: any variation of TenantContext param
    (
        re.compile(
            r'\btenant(?:_context|_ctx|_c|)?\s*:\s*TenantContext\s*=\s*Depends\(get_tenant_context\)',
            re.IGNORECASE
        ),
        "scope: PharmacyScope = Depends(get_pharmacy_scope)"
    ),
    (
        re.compile(
            r'\bctx\s*:\s*TenantContext\s*=\s*Depends\(get_tenant_context\)',
            re.IGNORECASE
        ),
        "scope: PharmacyScope = Depends(get_pharmacy_scope)"
    ),
]

TENANT_ID_REPLACEMENTS = [
    # tenant.tenant_id / tenant_context.tenant_id / ctx.tenant_id
    (re.compile(r'\btenant(?:_context|_ctx|)\.tenant_id\b'), "scope.tenant_id"),
    (re.compile(r'\bctx\.tenant_id\b'), "scope.tenant_id"),
    # current_user.tenant_id → scope.tenant_id
    (re.compile(r'\bcurrent_user\.tenant_id\b'), "scope.tenant_id"),
]

BRANCH_REPLACEMENTS = [
    (re.compile(r'\btenant(?:_context|_ctx|)\.branch_id\b'), "scope.tenant_id"),
    (re.compile(r'\bctx\.branch_id\b'), "scope.tenant_id"),
]


def transform(src: str, filename: str) -> tuple[str, list[str]]:
    """Apply all transformations to source. Returns (new_src, list_of_changes)."""
    changes = []
    lines = src.splitlines(keepends=True)
    out = []

    # Track whether we already injected our import
    has_scope_import = IMPORT_LINE in src
    inject_after_imports = not has_scope_import

    import_block_end = 0
    for i, line in enumerate(lines):
        if line.startswith("from ") or line.startswith("import "):
            import_block_end = i

    for i, line in enumerate(lines):
        new_line = line

        # ── Remove TenantContext from existing deps import lines ──────────
        for pat in IMPORT_REMOVALS:
            if re.search(pat, new_line):
                new_line_candidate = re.sub(pat, "", new_line)
                # only apply if it leaves a valid import line
                if "from core.deps import" in new_line_candidate:
                    changes.append(f"  L{i+1}: stripped TenantContext/get_tenant_context from import")
                    new_line = new_line_candidate

        # ── Apply param replacements ──────────────────────────────────────
        for pat, repl in PARAM_REPLACEMENTS:
            if pat.search(new_line):
                new_line = pat.sub(repl, new_line)
                changes.append(f"  L{i+1}: replaced TenantContext param with PharmacyScope")

        # ── Replace tenant_id attribute accesses ─────────────────────────
        for pat, repl in TENANT_ID_REPLACEMENTS:
            if pat.search(new_line):
                new_line = pat.sub(repl, new_line)
                changes.append(f"  L{i+1}: {pat.pattern} → {repl}")

        out.append(new_line)

        # ── Inject PharmacyScope import after import block ────────────────
        if inject_after_imports and i == import_block_end:
            out.append(IMPORT_LINE + "\n")
            changes.append(f"  L{i+2}: injected PharmacyScope import")
            inject_after_imports = False

    return "".join(out), changes


# ── main ─────────────────────────────────────────────────────────────────────

total_changes = 0
files_modified = 0

for fpath in sorted(ENDPOINTS_DIR.glob("*.py")):
    if fpath.name.startswith("_"):
        continue

    src = fpath.read_text(encoding="utf-8")

    # Only process files that use tenant context or current_user.tenant_id
    if "tenant_id" not in src and "TenantContext" not in src:
        print(f"SKIP  {fpath.name}  (no tenant references)")
        continue

    new_src, changes = transform(src, fpath.name)

    if new_src == src:
        print(f"NOOP  {fpath.name}")
        continue

    print(f"\nMOD   {fpath.name}  ({len(changes)} changes)")
    for c in changes:
        print(c)

    if not DRY_RUN:
        # Backup original
        shutil.copy(fpath, BACKUP_DIR / fpath.name)
        fpath.write_text(new_src, encoding="utf-8")

    total_changes += len(changes)
    files_modified += 1

print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Done: {files_modified} files modified, {total_changes} total changes.")
if DRY_RUN:
    print("Run without --dry-run to apply.")
else:
    print(f"Originals backed up to {BACKUP_DIR}")
