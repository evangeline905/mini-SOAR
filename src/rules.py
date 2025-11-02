from typing import List, Dict, Any
import yaml

def load_rules(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("rules", [])

def match_rule(rule_if: Dict[str, Any], alert: Dict[str, Any]) -> bool:
    if "type" in rule_if and alert.get("type") != rule_if["type"]:
        return False
    if "count_greater_than" in rule_if and not (
        isinstance(alert.get("count"), (int, float)) and alert["count"] > rule_if["count_greater_than"]
    ):
        return False
    if "severity_equals" in rule_if and alert.get("severity") != rule_if["severity_equals"]:
        return False
    return True

def evaluate(rules: List[Dict[str, Any]], alert: Dict[str, Any]) -> List[Dict[str, Any]]:
    matched = []
    for r in rules:
        cond = r.get("if", {})
        if match_rule(cond, alert):
            matched.append(r)
    return matched
