import json
from pathlib import Path
from typing import Any, Dict, List
from .rules import load_rules, evaluate
from .actions import execute

ROOT = Path(__file__).resolve().parents[1]

def run(alerts_path: Path, rules_path: Path) -> None:
    rules = load_rules(str(rules_path))
    alerts: List[Dict[str, Any]] = json.loads(alerts_path.read_text(encoding="utf-8"))

    for alert in alerts:
        hits = evaluate(rules, alert)
        if not hits:
            print(f"[INFO] Alert {alert.get('id')} matched no rules.")
            continue
        for rule in hits:
            print(f"[OK] Alert {alert.get('id')} matched rule: {rule.get('name')}")
            for step in rule.get("then", []):
                execute(step.get("action"), alert, step.get("params", {}))

if __name__ == "__main__":
    run(
        alerts_path=ROOT / "alerts.json",
        rules_path=ROOT / "config" / "rules.yaml",
    )
