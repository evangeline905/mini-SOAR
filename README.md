# mini-SOAR

A tiny, config-driven SOAR-like engine for interview demos.

## Features
- YAML rules (no code change for playbook updates)
- Action router + connectors (firewall/EDR stubs)
- CLI runner and REST API (FastAPI)
- Web UI for playbook editing and viewing

## Quickstart

```bash
pip install -r requirements.txt

# CLI mode
python -m src.main

# REST API (port 8000)
uvicorn src.api:app --reload

# Web UI for playbook editing (port 8001)
python start_web.py
# Then open http://127.0.0.1:8001 in your browser
```

## Structure
```
mini-SOAR/
├─ requirements.txt
├─ alerts.json
├─ config/rules.yaml
├─ start_web.py    # Web UI launcher (port 8001)
└─ src/
   ├─ main.py      # CLI entry
   ├─ api.py       # REST API (port 8000)
   ├─ web.py       # Web UI for playbook editing
   ├─ actions.py   # action router
   ├─ rules.py     # rule engine
   └─ connectors/
      ├─ firewall.py
      └─ edr.py
```

## Web UI

The Web UI provides an intuitive interface for:
- **Editing Playbooks**: Write YAML rules with syntax highlighting and validation
- **Viewing Playbooks**: Browse all rules in a formatted, easy-to-read format
- **Statistics**: See rule counts and overview

To start the Web UI:
```bash
python start_web.py
```

Then open http://127.0.0.1:8001 in your browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.