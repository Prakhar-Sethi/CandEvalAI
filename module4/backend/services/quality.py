"""Code quality heuristics — no external dependencies."""
import re


def analyze(source_code: str, language_id: int) -> dict:
    """
    Compute code quality metrics.
    Returns: {comment_ratio, avg_line_length, naming_score, overall_quality}
    """
    lines = source_code.splitlines()
    non_empty = [l for l in lines if l.strip()]
    total = len(non_empty) or 1

    # Comment ratio
    comment_lines = sum(1 for l in non_empty if _is_comment(l.strip(), language_id))
    comment_ratio = round(comment_lines / total, 3)

    # Average line length
    avg_len = round(sum(len(l) for l in non_empty) / total, 1)

    # Naming score: penalise single-char variables (except i,j,k,n,m,x,y,z)
    allowed_singles = {"i", "j", "k", "n", "m", "x", "y", "z", "t", "s", "c"}
    identifiers = re.findall(r'\b([a-zA-Z_]\w*)\b', source_code)
    bad = sum(1 for v in identifiers if len(v) == 1 and v.lower() not in allowed_singles)
    naming_score = round(max(0.0, 1.0 - bad / max(len(identifiers), 1) * 5), 3)

    # Line length score (penalise > 100 chars)
    long_lines = sum(1 for l in non_empty if len(l) > 100)
    line_len_score = round(max(0.0, 1.0 - long_lines / total), 3)

    # Overall (weighted)
    # Comments 25%, line length 25%, naming 50%
    overall = round(0.25 * min(comment_ratio * 3, 1.0) + 0.25 * line_len_score + 0.50 * naming_score, 3)

    return {
        "comment_ratio": comment_ratio,
        "avg_line_length": avg_len,
        "naming_score": naming_score,
        "line_length_score": line_len_score,
        "overall_quality": overall,
    }


def _is_comment(line: str, language_id: int) -> bool:
    if language_id == 71:  # Python
        return line.startswith("#")
    if language_id in (63, 62, 54):  # JS, Java, C++
        return line.startswith("//") or line.startswith("/*") or line.startswith("*")
    return line.startswith("#") or line.startswith("//")
