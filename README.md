# mini-SOAR

A tiny, config-driven SOAR-like engine for interview demos and security automation.

## Features

### Core Engine
- **YAML-based Rules**: Configure playbooks without code changes
- **Action Router**: Modular action system with connectors (firewall/EDR stubs)
- **CLI Runner**: Command-line interface for testing and automation
- **REST API**: FastAPI-based API for integration (port 8000)
- **Web UI**: Comprehensive web interface for playbook management (port 8001)

### Visual Playbook Builder
- **Drag-and-Drop Interface**: Build playbooks visually without writing YAML
- **Real-time YAML Generation**: See instant playbook (runbook) YAML as you configure
- **Template Generation**: Automatically generate reusable templates from instances
- **Expression Testing**: Test condition expressions with mock data before deployment
- **Dry-run Execution**: Preview playbook execution with detailed step-by-step logs
- **Alert Input**: Load and normalize alerts from JSON input
- **Enrichment Integration**: Configure VirusTotal, AbuseIPDB, and GeoIP enrichment
- **Action Configuration**: Set up automated responses for true/false branches

### Rule System
- **Standardized Format**: Modern rule structure with `conditions.all` and `actions` arrays
- **Flexible Conditions**: Support for multiple operators (equals, greater_than, contains, etc.)
- **Action Parameters**: Configure action parameters dynamically
- **MITRE Mapping**: Associate rules with MITRE ATT&CK techniques

## Quickstart

### Installation

```bash
pip install -r requirements.txt
```

### Running the Application

#### CLI Mode
```bash
python -m src.main
```

#### REST API (port 8000)
```bash
uvicorn src.api:app --reload
```

#### Web UI (port 8001)
```bash
python start_web.py
```
Then open http://127.0.0.1:8001 in your browser.

## Web UI Features

### Visual Playbook Builder

The Visual Playbook Builder provides an intuitive interface for creating playbooks:

1. **Alert Input**: Load alert JSON and automatically map fields to collect step
2. **Collect/Normalize**: Configure data collection and normalization mappings
3. **Enrich**: Enable/disable enrichment services (VirusTotal Hash, VirusTotal URL, AbuseIPDB/GeoIP)
4. **Condition**: Write and test condition expressions with real-time evaluation
5. **Actions**: Configure automated actions for true/false branches:
   - Mail Quarantine
   - Suspend User
   - Block IP
   - Notify Email
   - Create Ticket
6. **Playbook Template**: View and copy auto-generated template YAML
7. **Runbook Preview**: See instant playbook YAML generated from current configuration

### Splunk Normalizer Lab

Test and validate Splunk alert normalization:
- Input sample alerts
- View normalized output
- Test normalization rules

### Playbook Management

- **Edit Playbook**: Write and edit YAML rules with syntax validation
- **View Playbook**: Browse all rules in a formatted, easy-to-read format
- **Statistics**: See rule counts and overview

## Rule Format

### Standardized YAML Structure

```yaml
rules:
  - name: brute_force
    conditions:
      all:
        - field: alert.type
          operator: equals
          value: Brute Force
        - field: alert.event_count
          operator: greater_than
          value: 10
    actions:
      - action: firewall.block_ip
    mitre:
      - T1110
  
  - name: malware_quarantine
    conditions:
      all:
        - field: alert.type
          operator: equals
          value: Malware
        - field: alert.severity
          operator: equals
          value: High
    actions:
      - action: isolate_host
        params:
          host_field: machine
      - action: create_ticket
        params:
          priority: high
    mitre:
      - T1204
```

### Supported Operators

- `equals`: Exact match
- `not_equals`: Not equal
- `contains`: String contains
- `greater_than`: Numeric greater than
- `less_than`: Numeric less than
- `greater_than_or_equal`: Numeric >=
- `less_than_or_equal`: Numeric <=

### Playbook YAML Structure

```yaml
name: Phishing Email Playbook
steps:
  - id: collect
    type: collect_normalize
    params:
      mapping:
        sender: "${alert.sender}"
        recipient: "${alert.recipient}"
        subject: "${alert.subject}"
    next: [vt_hash, vt_url]
  
  - id: vt_hash
    type: vt_hash_lookup
    params:
      hashes: "${steps.collect.attachment_hashes}"
    next: [evaluate]
  
  - id: evaluate
    type: condition
    params:
      expression: "${steps.vt_hash.any_malicious == true || steps.vt_url.max_score >= 70}"
    true_next: [high]
    false_next: [low]
  
  - id: high
    type: action_group
    params:
      actions:
        - action: mail.quarantine
          params:
            message_id: "${alert.alert_id}"
  
  - id: low
    type: action_group
    params:
      actions: []
```

## Project Structure

```
mini-SOAR/
├─ requirements.txt          # Python dependencies
├─ start_web.py              # Web UI launcher (port 8001)
├─ config/
│  ├─ rules.yaml             # Rule definitions (YAML)
│  └─ rules.json             # Rule definitions (JSON)
├─ backend/
│  └─ mock_enrichment.py     # Mock enrichment services
└─ src/
   ├─ main.py                # CLI entry point
   ├─ api.py                 # REST API (port 8000)
   ├─ web.py                 # Web UI server
   ├─ rules.py               # Rule engine
   ├─ actions.py             # Action router
   ├─ pages/
   │  ├─ PlaybookBuilder.tsx # Visual Playbook Builder
   │  └─ PlaybookPage.jsx    # Playbook management page
   ├─ components/            # React components
   │  ├─ ActionsPanel.tsx
   │  ├─ CollectPanel.tsx
   │  ├─ ConditionPanel.tsx
   │  ├─ EnrichPanel.tsx
   │  └─ YamlPreviewPanel.tsx
   ├─ lib/
   │  ├─ rulesEngine.js      # Frontend rule evaluation
   │  └─ normalize.js        # Normalization utilities
   ├─ types/
   │  └─ playbook.ts         # TypeScript type definitions
   ├─ utils/
   │  └─ generateYaml.ts     # YAML generation utilities
   └─ connectors/
      ├─ firewall.py         # Firewall connector stub
      └─ edr.py              # EDR connector stub
```

## Usage Examples

### Creating a Playbook via Visual Builder

1. Navigate to **Visual Playbook Builder** in the web UI
2. Load an alert JSON or enter alert data manually
3. Configure collect/normalize mappings
4. Enable enrichment services as needed
5. Write and test condition expressions
6. Configure actions for true/false branches
7. Copy the generated template YAML or use the instant runbook

### Testing Expressions

1. In the **Condition** panel, write your expression
2. Click **Test expression** to evaluate with mock data
3. View the result (TRUE/FALSE) and steps data
4. Adjust the expression as needed

### Running Dry-run

1. Configure your playbook in the Visual Builder
2. The **Runbook** panel shows the generated YAML
3. View execution logs and step results in the dry-run section

## API Endpoints

### REST API (port 8000)

- `POST /api/playbooks/dryrun`: Execute playbook dry-run
- `POST /api/playbooks`: Save playbook to storage
- `GET /api/playbook`: Get current playbook (YAML and JSON)

### Web UI Routes (port 8001)

- `/`: Home page with navigation
- `/builder`: Visual Playbook Builder
- `/splunk-lab`: Splunk Normalizer Lab
- `/edit`: Edit Playbook (YAML editor)
- `/view`: View Playbook (read-only)

## Development

### Adding New Actions

1. Define action in `src/actions.py`
2. Add connector stub in `src/connectors/`
3. Update action list in `PlaybookBuilder.tsx`

### Adding New Enrichment Services

1. Add mock implementation in `backend/mock_enrichment.py`
2. Update enrichment panel in `PlaybookBuilder.tsx`
3. Add step type in YAML generation logic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
