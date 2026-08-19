"""One-off: rebrand the product from NEPMS to Pharvix across the source tree.

    python rename_to_pharvix.py --check
    python rename_to_pharvix.py --run

Case-preserving: NEPMS -> Pharvix, nepms -> pharvix, Nepms -> Pharvix.

Deliberately left alone:
  * `nepms_local.db` -- the on-disk SQLite backup. Renaming the string without
    renaming the 35 MB file (and every one-off script that opens it by name)
    would just break the offline fallback.
  * The `NEPMS` directory name itself -- renaming the working tree mid-session
    breaks every absolute path, the git checkout, and both running servers.
  * Generated output: node_modules, .next, venv, __pycache__, *.pyc, .git.

Also rewrites the expanded acronym, since "Pharvix" is a name and not an
initialism: "National Electronic Pharmacy Management System" -> "Pharmacy
Management System".
"""

from __future__ import annotations

import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

SKIP_DIRS = {
    "node_modules", ".next", "venv", ".venv", "__pycache__", ".git",
    "dist", "build", ".turbo", ".pytest_cache", "storage", "out",
    # Chrome profile for the WhatsApp session -- rewriting it kills the login.
    ".wwebjs_auth", ".wwebjs_cache",
}
# This script, and anything regenerated or historical.
SKIP_FILES = {"rename_to_pharvix.py"}
SKIP_EXT = {
    ".pyc", ".pyo", ".so", ".dll", ".exe", ".db", ".sqlite", ".sqlite3",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".svg", ".pdf",
    ".woff", ".woff2", ".ttf", ".eot", ".zip", ".gz", ".map", ".log",
}

# The sentinel must NOT itself contain "nepms": the replacement loop below would
# rewrite the sentinel too, and the restore at the end would then never match --
# leaving a raw NUL-wrapped placeholder where the filename should be.
SENTINEL = "\x00__KEEP_DB_FILENAME__\x00"
PROTECTED = "nepms_local.db"

# Order matters: the long acronym expansion must run before the bare token.
REPLACEMENTS = [
    ("National Electronic Pharmacy Management System", "Pharvix Pharmacy Management System"),
    ("NEPMS", "Pharvix"),
    ("Nepms", "Pharvix"),
    ("nepms", "pharvix"),
]


def candidate_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() in SKIP_EXT or fn in SKIP_FILES:
                continue
            yield os.path.join(dirpath, fn)


def rewrite(text: str) -> str:
    text = text.replace(PROTECTED, SENTINEL)
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    return text.replace(SENTINEL, PROTECTED)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--run", action="store_true")
    args = ap.parse_args()

    changed, total_hits, skipped = [], 0, 0
    for path in candidate_files():
        try:
            with open(path, "r", encoding="utf-8") as f:
                original = f.read()
        except (UnicodeDecodeError, PermissionError, OSError):
            skipped += 1
            continue

        if not re.search("nepms", original, re.I):
            continue
        updated = rewrite(original)
        if updated == original:
            continue

        hits = len(re.findall("nepms", original, re.I)) - original.count(PROTECTED)
        total_hits += hits
        changed.append((os.path.relpath(path, ROOT), hits))

        if args.run:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(updated)

    verb = "rewrote" if args.run else "would rewrite"
    print(f"{verb} {total_hits} occurrences across {len(changed)} files "
          f"({skipped} binary/unreadable files skipped)")
    for rel, n in sorted(changed, key=lambda x: -x[1])[:25]:
        print(f"   {n:4}  {rel}")
    if len(changed) > 25:
        print(f"   ... and {len(changed) - 25} more files")

    if not args.run:
        print("\ncheck only -- nothing was written. Pass --run to apply.")


if __name__ == "__main__":
    main()
