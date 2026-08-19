"""Date-formatting SQL that works on both SQLite and PostgreSQL.

`strftime()` is a SQLite built-in with no PostgreSQL equivalent -- Postgres uses
`to_char()`. Reports were written against the local SQLite file, so every
month-bucketed query died with "function strftime(unknown, timestamp) does not
exist" the moment the app pointed at Supabase.

Rather than branch on `db.bind.dialect.name` at each call site, these render
themselves per dialect at compile time, so a query reads the same either way:

    from core.sql_compat import year_month
    q.group_by(year_month(Sale.created_at))
"""

from __future__ import annotations

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import FunctionElement
from sqlalchemy.types import String


class year_month(FunctionElement):
    """'YYYY-MM' bucket for a date/timestamp column."""

    type = String()
    name = "year_month"
    inherit_cache = True


class year(FunctionElement):
    """'YYYY' bucket for a date/timestamp column."""

    type = String()
    name = "year"
    inherit_cache = True


@compiles(year_month)
def _year_month_default(element, compiler, **kw):
    (col,) = element.clauses
    return f"to_char({compiler.process(col, **kw)}, 'YYYY-MM')"


@compiles(year_month, "sqlite")
def _year_month_sqlite(element, compiler, **kw):
    (col,) = element.clauses
    return f"strftime('%Y-%m', {compiler.process(col, **kw)})"


@compiles(year)
def _year_default(element, compiler, **kw):
    (col,) = element.clauses
    return f"to_char({compiler.process(col, **kw)}, 'YYYY')"


@compiles(year, "sqlite")
def _year_sqlite(element, compiler, **kw):
    (col,) = element.clauses
    return f"strftime('%Y', {compiler.process(col, **kw)})"
