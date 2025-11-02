from fastapi import FastAPI
from typing import List, Dict, Any
from pathlib import Path
from .rules import load_rules, evaluate
from .actions import execute

app = FastAPI(title="Morpheus-Lite SOAR API")
RULES = load_rules(str(Path(__file__).resolve().parents[1] / "config" / "rules.yaml"))

@app.get("/")
def health():
    return {"ok": True}

@app.post("/ingest")
def ingest(alerts: List[Dict[str, Any]]):
    results = []
    for alert in alerts:
        hits = evaluate(RULES, alert)
        actions = []
        for rule in hits:
            for step in rule.get("then", []):
                execute(step.get("action"), alert, step.get("params", {}))
                actions.append(step.get("action"))
        results.append({"alert_id": alert.get("id"), "matched_rules": [h["name"] for h in hits], "actions": actions})
    return {"results": results}
