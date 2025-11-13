from typing import List, Dict, Any
import yaml

def load_rules(path: str) -> List[Dict[str, Any]]:
    """Load rules from YAML file with new format:
    rules:
      - name: rule_name
        conditions:
          all:
            - field: alert.type
              operator: equals
              value: Brute Force
        actions:
          - action: firewall.block_ip
        mitre:
          - T1110
    """
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("rules", [])

def evaluate_condition(condition: Dict[str, Any], alert: Dict[str, Any]) -> bool:
    """Evaluate a single condition against an alert.
    
    Args:
        condition: Dict with 'field', 'operator', 'value'
        alert: Alert data dict
        
    Returns:
        bool: True if condition matches
    """
    field = condition.get("field", "")
    operator = condition.get("operator", "")
    value = condition.get("value")
    
    # Extract field value from alert (support nested paths like alert.type)
    if field.startswith("alert."):
        field_path = field.replace("alert.", "").split(".")
        alert_value = alert
        for part in field_path:
            if isinstance(alert_value, dict) and part in alert_value:
                alert_value = alert_value[part]
            else:
                alert_value = None
                break
    else:
        alert_value = alert.get(field)
    
    # Apply operator
    if operator == "equals":
        return alert_value == value
    elif operator == "greater_than":
        try:
            return float(alert_value) > float(value)
        except (ValueError, TypeError):
            return False
    elif operator == "less_than":
        try:
            return float(alert_value) < float(value)
        except (ValueError, TypeError):
            return False
    elif operator == "greater_than_or_equal":
        try:
            return float(alert_value) >= float(value)
        except (ValueError, TypeError):
            return False
    elif operator == "less_than_or_equal":
        try:
            return float(alert_value) <= float(value)
        except (ValueError, TypeError):
            return False
    elif operator == "contains":
        if isinstance(alert_value, str) and isinstance(value, str):
            return value in alert_value
        return False
    elif operator == "not_equals":
        return alert_value != value
    else:
        # Unknown operator, default to False
        return False

def match_rule(rule: Dict[str, Any], alert: Dict[str, Any]) -> bool:
    """Check if a rule matches an alert based on conditions.
    
    Args:
        rule: Rule dict with 'conditions' field
        alert: Alert data dict
        
    Returns:
        bool: True if all conditions match
    """
    conditions = rule.get("conditions", {})
    
    # Support conditions.all (all conditions must match)
    if "all" in conditions:
        all_conditions = conditions["all"]
        if not isinstance(all_conditions, list):
            return False
        
        for condition in all_conditions:
            if not evaluate_condition(condition, alert):
                return False
        return True
    
    # Support conditions.any (at least one condition must match)
    elif "any" in conditions:
        any_conditions = conditions["any"]
        if not isinstance(any_conditions, list):
            return False
        
        for condition in any_conditions:
            if evaluate_condition(condition, alert):
                return True
        return False
    
    # No conditions defined, rule doesn't match
    return False

def evaluate(rules: List[Dict[str, Any]], alert: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Evaluate rules against an alert.
    
    Args:
        rules: List of rule dicts
        alert: Alert data dict
        
    Returns:
        List of matched rules
    """
    matched = []
    for rule in rules:
        if match_rule(rule, alert):
            matched.append(rule)
    return matched
