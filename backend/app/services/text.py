"""
text.py — removing bold / italic markers from text.

What it does:   titles, descriptions and choice labels may contain **bold** and *italic*
                markers (added by the builder's B / I buttons). `strip_formatting`
                returns the text without them.
Depends on:     nothing.
Depended on by: presenters.py (answers shown in results), services/stats.py (chart
                labels), routers/responses.py (CSV export).

The frontend draws the markers as real bold and italic on the public form
(frontend/src/lib/formatted-text.tsx, which uses the same pattern). Places that need
plain text, such as a spreadsheet column heading, use this instead.
"""

import re

# One formatted run: **something** or *something*, with no asterisks inside. Bold is
# listed first so "**x**" is not read as italic around "*x*".
MARKED_RUN = re.compile(r"\*\*([^*\n]+)\*\*|\*([^*\n]+)\*")


def strip_formatting(text: str) -> str:
    """ "Pick your **favourite** fruit" -> "Pick your favourite fruit". """

    def keep_inner_text(match: re.Match) -> str:
        # Group 1 is set for a bold run, group 2 for an italic run.
        return match.group(1) if match.group(1) is not None else match.group(2)

    return MARKED_RUN.sub(keep_inner_text, text)
