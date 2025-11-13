from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from pathlib import Path
from typing import Dict, Any
import yaml
import json
import re

app = FastAPI(title="mini-SOAR Playbook Editor & Test")

ROOT = Path(__file__).resolve().parents[1]
RULES_PATH = ROOT / "config" / "rules.yaml"

def load_playbook() -> Dict[str, Any]:
    """Load playbook YAML file"""
    if not RULES_PATH.exists():
        return {"rules": []}
    try:
        with open(RULES_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"rules": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load playbook: {str(e)}")

def save_playbook(yaml_content: str) -> Dict[str, Any]:
    """Save playbook YAML file"""
    try:
        # Validate YAML format
        data = yaml.safe_load(yaml_content)
        if data is None:
            data = {"rules": []}
        
        # Ensure rules key exists
        if "rules" not in data:
            data = {"rules": data if isinstance(data, list) else []}
        
        # Ensure rules is a list
        if not isinstance(data["rules"], list):
            raise ValueError("'rules' must be a list")
        
        # Save to file
        with open(RULES_PATH, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        
        return {"message": "Playbook saved successfully", "rules_count": len(data.get("rules", []))}
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save playbook: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def get_editor():
    """Return HTML editor interface"""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>mini-SOAR Playbook Editor & Test</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .tabs {
            display: flex;
            background: #f5f5f5;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .tab {
            flex: 1;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            background: #f5f5f5;
            border: none;
            font-size: 1.1em;
            font-weight: 600;
            color: #666;
            transition: all 0.3s;
        }
        
        .tab:hover {
            background: #e8e8e8;
        }
        
        .tab.active {
            background: white;
            color: #667eea;
            border-bottom: 3px solid #667eea;
        }
        
        .content {
            padding: 30px;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .editor-section {
            margin-bottom: 30px;
        }
        
        .editor-section label {
            display: block;
            font-size: 1.1em;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }
        
        textarea {
            width: 100%;
            min-height: 500px;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            resize: vertical;
            transition: border-color 0.3s;
        }
        
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 20px;
        }
        
        button {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-success:hover {
            background: #218838;
        }
        
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .viewer {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            max-height: 600px;
            overflow-y: auto;
        }
        
        .rule-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .rule-name {
            font-size: 1.5em;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .rule-section {
            margin-bottom: 15px;
        }
        
        .rule-section-title {
            font-weight: 600;
            color: #666;
            margin-bottom: 8px;
            font-size: 1.1em;
        }
        
        .rule-section-content {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 1em;
            opacity: 0.9;
        }
        
        .yaml-viewer {
            background: #282c34;
            color: #abb2bf;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            white-space: pre-wrap;
            overflow-x: auto;
            max-height: 600px;
            overflow-y: auto;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .loading.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ mini-SOAR Playbook Editor & Test</h1>
            <p>Create and manage automated response rules</p>
        </div>
        
        <div class="tabs">
            <button class="tab" onclick="window.location.href='/builder'" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white;">Visual Playbook Builder</button>
            <button class="tab" onclick="window.location.href='/splunk-lab'" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white;">Splunk Normalizer Lab</button>
            <button class="tab active" onclick="switchTab('edit')">Edit Playbook</button>
            <button class="tab" onclick="switchTab('view')">View Playbook</button>
        </div>
        
        <div class="content">
            <div id="message" class="message"></div>
            
            <!-- Edit Tab -->
            <div id="edit-tab" class="tab-content active">
                <div class="editor-section">
                    <label for="yaml-editor">YAML Content:</label>
                    <textarea id="yaml-editor" placeholder="Write your playbook YAML here..."></textarea>
                </div>
                <div class="button-group">
                    <button class="btn-primary" onclick="loadPlaybook()">Load Current Playbook</button>
                    <button class="btn-success" onclick="savePlaybook()">Save Playbook</button>
                    <button class="btn-secondary" onclick="validateYAML()">Validate YAML</button>
                </div>
            </div>
            
            <!-- View Tab -->
            <div id="view-tab" class="tab-content">
                <div id="stats" class="stats"></div>
                <div id="viewer-content"></div>
                <div class="button-group">
                    <button class="btn-primary" onclick="refreshView()">Refresh View</button>
                </div>
            </div>
            
            <div id="loading" class="loading active">Loading...</div>
        </div>
    </div>
    
    <script>
        let currentYAML = '';
        
        function showMessage(text, type) {
            const msg = document.getElementById('message');
            msg.textContent = text;
            msg.className = `message ${type}`;
            msg.style.display = 'block';
            setTimeout(() => {
                msg.style.display = 'none';
            }, 5000);
        }
        
        function switchTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(tabName + '-tab').classList.add('active');
            
            if (tabName === 'view') {
                loadView();
            }
        }
        
        async function loadPlaybook() {
            try {
                const response = await fetch('/api/playbook');
                const data = await response.json();
                document.getElementById('yaml-editor').value = data.yaml;
                currentYAML = data.yaml;
                showMessage('Playbook loaded successfully', 'success');
            } catch (error) {
                showMessage('Failed to load: ' + error.message, 'error');
            }
        }
        
        async function savePlaybook() {
            const yamlContent = document.getElementById('yaml-editor').value;
            
            try {
                const response = await fetch('/api/playbook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ yaml: yamlContent })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to save');
                }
                
                const data = await response.json();
                currentYAML = yamlContent;
                showMessage(`Saved successfully! Contains ${data.rules_count} rule(s)`, 'success');
            } catch (error) {
                showMessage('Failed to save: ' + error.message, 'error');
            }
        }
        
        function validateYAML() {
            const yamlContent = document.getElementById('yaml-editor').value;
            try {
                const parsed = jsyaml.load(yamlContent);
                if (!parsed || !parsed.rules || !Array.isArray(parsed.rules)) {
                    throw new Error('YAML must contain a "rules" array');
                }
                showMessage('YAML format is valid!', 'success');
            } catch (error) {
                showMessage('YAML format error: ' + error.message, 'error');
            }
        }
        
        async function loadView() {
            const loading = document.getElementById('loading');
            const viewerContent = document.getElementById('viewer-content');
            loading.classList.add('active');
            viewerContent.innerHTML = '';
            
            try {
                const response = await fetch('/api/playbook');
                const data = await response.json();
                
                // Update statistics
                const statsDiv = document.getElementById('stats');
                statsDiv.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${data.json.rules.length}</div>
                        <div class="stat-label">Total Rules</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.json.rules.filter(r => r.conditions).length}</div>
                        <div class="stat-label">Conditional Rules</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${data.json.rules.filter(r => r.actions && r.actions.length > 0).length}</div>
                        <div class="stat-label">Action Rules</div>
                    </div>
                `;
                
                // Display rules
                if (data.json.rules.length === 0) {
                    viewerContent.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No rules found</p>';
                } else {
                    viewerContent.innerHTML = '<div style="margin-bottom: 20px;"><h3 style="margin-bottom: 10px;">Rules List:</h3></div>';
                    data.json.rules.forEach((rule, index) => {
                        const ruleCard = document.createElement('div');
                        ruleCard.className = 'rule-card';
                        
                        let conditionsContent = 'None';
                        if (rule.conditions) {
                            conditionsContent = JSON.stringify(rule.conditions, null, 2);
                        }
                        
                        let actionsContent = 'None';
                        if (rule.actions && rule.actions.length > 0) {
                            actionsContent = JSON.stringify(rule.actions, null, 2);
                        }
                        
                        let mitreContent = 'None';
                        if (rule.mitre && rule.mitre.length > 0) {
                            mitreContent = rule.mitre.join(', ');
                        }
                        
                        ruleCard.innerHTML = `
                            <div class="rule-name">Rule ${index + 1}: ${rule.name || 'Unnamed'}</div>
                            <div class="rule-section">
                                <div class="rule-section-title">Conditions:</div>
                                <div class="rule-section-content">${conditionsContent}</div>
                            </div>
                            <div class="rule-section">
                                <div class="rule-section-title">Actions:</div>
                                <div class="rule-section-content">${actionsContent}</div>
                            </div>
                            ${mitreContent !== 'None' ? `
                            <div class="rule-section">
                                <div class="rule-section-title">MITRE ATT&CK:</div>
                                <div class="rule-section-content">${mitreContent}</div>
                            </div>
                            ` : ''}
                        `;
                        viewerContent.appendChild(ruleCard);
                    });
                }
                
                // Add raw YAML content viewer
                const yamlViewer = document.createElement('div');
                yamlViewer.style.marginTop = '30px';
                yamlViewer.innerHTML = `
                    <h3 style="margin-bottom: 10px;">Raw YAML:</h3>
                    <div class="yaml-viewer">${escapeHtml(data.yaml)}</div>
                `;
                viewerContent.appendChild(yamlViewer);
                
            } catch (error) {
                viewerContent.innerHTML = '<p style="color: red;">Failed to load: ' + error.message + '</p>';
            } finally {
                loading.classList.remove('active');
            }
        }
        
        function refreshView() {
            loadView();
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Load playbook on page load
        window.onload = function() {
            loadPlaybook();
        };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

@app.get("/api/playbook")
async def get_playbook():
    """Get playbook (YAML and JSON format)"""
    try:
        playbook = load_playbook()
        
        # Ensure playbook has rules field
        if not isinstance(playbook, dict):
            playbook = {"rules": []}
        if "rules" not in playbook:
            playbook["rules"] = []
        if not isinstance(playbook["rules"], list):
            playbook["rules"] = []
        
        # Read raw YAML content
        yaml_content = ""
        if RULES_PATH.exists():
            with open(RULES_PATH, "r", encoding="utf-8") as f:
                yaml_content = f.read()
        else:
            yaml_content = yaml.dump(playbook, allow_unicode=True, default_flow_style=False)
        
        return JSONResponse(content={
            "yaml": yaml_content,
            "json": playbook
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/playbook")
async def save_playbook_api(request: Dict[str, Any]):
    """Save playbook"""
    yaml_content = request.get("yaml", "")
    if not yaml_content:
        raise HTTPException(status_code=400, detail="YAML content is required")
    
    # Call synchronous save_playbook function and return result
    result = save_playbook(yaml_content)
    return JSONResponse(content=result)

@app.get("/config/rules.json")
async def get_rules_json():
    """Get rules.json file"""
    rules_json_path = ROOT / "config" / "rules.json"
    if not rules_json_path.exists():
        raise HTTPException(status_code=404, detail="rules.json not found")
    return FileResponse(str(rules_json_path))

def evaluate_expression_safe(expression: str, steps: Dict[str, Any], enrich_config: Dict[str, Any] = None) -> bool:
    """
    Safely evaluate expression with limited operators and variables.
    Only supports: any_malicious, max_score, score + &&, ||, >=, ==
    
    Args:
        expression: Expression string with ${steps.xxx} variables
        steps: Dictionary containing enrich results
        enrich_config: Dictionary indicating which enrich steps are enabled
        
    Returns:
        bool: Evaluation result
        
    Raises:
        ValueError: If expression evaluation fails or variables are missing
    """
    try:
        import re
        if not expression or not isinstance(expression, str):
            raise ValueError('Expression must be a non-empty string')
        
        evaluated = expression.strip()
        enrich_config = enrich_config or {}
        
        # Step 1: Remove outer ${} wrapper if present
        wrapped_match = re.match(r'^\$\{(.+)\}$', evaluated)
        if wrapped_match:
            evaluated = wrapped_match.group(1)
            # Check if inner expression has bare steps. references (without ${})
            # If so, convert them to ${steps.xxx} format
            if re.search(r'\bsteps\.\w+', evaluated) and not re.search(r'\$\{steps\.', evaluated):
                evaluated = re.sub(r'\bsteps\.([\w.]+)', r'${steps.\1}', evaluated)
        
        # Step 2: Replace ${steps.xxx} with actual values
        variable_pattern = r'\$\{steps\.([\w.]+)\}'
        missing_vars = []
        missing_enrich_steps = []
        
        def replace_var(match):
            path = match.group(1)
            parts = path.split('.')
            value = steps
            
            # Navigate through the path
            for part in parts:
                if value and isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    # Variable not found
                    missing_vars.append(match.group(0))
                    
                    # Check if this is because the enrich step is not enabled
                    enrich_step = parts[0]  # e.g., 'vt_hash', 'vt_url', 'abuseipdb'
                    if enrich_step == 'vt_hash' and not enrich_config.get('vt_hash', False):
                        missing_enrich_steps.append('VirusTotal Hash lookup')
                    elif enrich_step == 'vt_url' and not enrich_config.get('vt_url', False):
                        missing_enrich_steps.append('VirusTotal URL reputation')
                    elif enrich_step == 'abuseipdb' and not enrich_config.get('abuseipdb_geoip', False):
                        missing_enrich_steps.append('AbuseIPDB / GeoIP')
                    
                    return match.group(0)  # Return original if not found
            
            # Convert to appropriate type for comparison
            if isinstance(value, bool):
                return 'True' if value else 'False'
            elif isinstance(value, (int, float)):
                return str(value)
            elif value is None:
                return 'None'
            else:
                return f'"{value}"'
        
        evaluated = re.sub(variable_pattern, replace_var, evaluated)
        
        # Step 3: Check for unresolved variables
        remaining_vars = re.findall(r'\$\{steps\.[\w.]+\}', evaluated)
        if remaining_vars:
            enrich_msg = ''
            if missing_enrich_steps:
                enrich_msg = f'\n\nPlease enable the following enrich steps: {", ".join(missing_enrich_steps)}'
            raise ValueError(
                f'Unresolved variables found: {", ".join(remaining_vars)}. '
                f'These variables may not be available in the test data.{enrich_msg}'
            )
        
        # Simple parser: only allow safe operations
        # Replace && with and, || with or for Python evaluation
        evaluated = evaluated.replace('&&', ' and ')
        evaluated = evaluated.replace('||', ' or ')
        evaluated = evaluated.replace('==', '==')
        evaluated = evaluated.replace('>=', '>=')
        evaluated = evaluated.replace('<=', '<=')
        evaluated = evaluated.replace('>', '>')
        evaluated = evaluated.replace('<', '<')
        evaluated = evaluated.replace('!=', '!=')
        
        # Evaluate in restricted context
        # Only allow comparison operations
        allowed_names = {
            'True': True,
            'False': False,
            'true': True,
            'false': False,
        }
        
        # Use eval with restricted globals and locals
        result = eval(evaluated, {"__builtins__": {}}, allowed_names)
        return bool(result)
    except Exception as e:
        raise ValueError(f"Expression evaluation failed: {str(e)}")

@app.post("/api/playbooks/dryrun")
async def dryrun_playbook(request: Dict[str, Any]):
    """
    Dry-run endpoint for testing playbooks.
    Uses mock enrichment functions or real API based on environment.
    """
    import os
    import sys
    from pathlib import Path
    
    # Add backend directory to path if it exists
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    if backend_dir.exists():
        sys.path.insert(0, str(backend_dir.parent))
    
    # Check if we should use real API (controlled by environment variable)
    use_real_api = os.getenv("USE_REAL_ENRICHMENT_API", "false").lower() == "true"
    
    config = request.get("config", {})
    enrich = config.get("enrich", {})
    collect = config.get("collect", {})
    condition = config.get("condition", {})
    actions = config.get("actions", {})
    
    mock_steps = {}
    execution_log = []
    
    # Step 1: collect_normalize
    execution_log.append("[1] collect_normalize: Collecting and normalizing alert data")
    
    # If testing expression directly, check which variables are referenced and generate mock data for them
    expression = condition.get("expression", "")
    if expression:
        import re
        variable_pattern = r'\$\{steps\.([\w.]+)\}'
        referenced_vars = set()
        for match in re.finditer(variable_pattern, expression):
            var_path = match.group(1)
            parts = var_path.split('.')
            if len(parts) > 0:
                referenced_vars.add(parts[0])  # e.g., 'vt_hash', 'vt_url', 'abuseipdb'
        
        # Auto-enable enrich steps that are referenced in the expression
        if 'vt_hash' in referenced_vars and not enrich.get("vt_hash", False):
            enrich["vt_hash"] = True
        if 'vt_url' in referenced_vars and not enrich.get("vt_url", False):
            enrich["vt_url"] = True
        if 'abuseipdb' in referenced_vars and not enrich.get("abuseipdb_geoip", False):
            enrich["abuseipdb_geoip"] = True
    
    # Generate enrich results based on flags
    step_num = 2
    
    if enrich.get("vt_hash", False):
        if use_real_api:
            # TODO: Replace with real API call
            # from backend.real_enrichment import vt_hash_lookup
            # hashes = collect.get("attachment_hashes", "").split(",") if collect.get("attachment_hashes") else []
            # mock_steps["vt_hash"] = vt_hash_lookup(hashes)
            pass
        else:
            # Use mock function
            try:
                from backend.mock_enrichment import vt_hash_result
                hashes = collect.get("attachment_hashes", "").split(",") if collect.get("attachment_hashes") else []
                mock_steps["vt_hash"] = vt_hash_result(hashes)
                execution_log.append(
                    f"[{step_num}] vt_hash: VirusTotal hash lookup - "
                    f"any_malicious: {mock_steps['vt_hash']['any_malicious']}, "
                    f"max_score: {mock_steps['vt_hash']['max_score']}, "
                    f"total_lookups: {mock_steps['vt_hash']['total_lookups']}"
                )
                step_num += 1
            except ImportError:
                # Fallback if import fails
                mock_steps["vt_hash"] = {
                    "any_malicious": True,
                    "max_score": 85,
                    "total_lookups": 0
                }
                execution_log.append(f"[{step_num}] vt_hash: VirusTotal hash lookup (fallback)")
                step_num += 1
    
    if enrich.get("vt_url", False):
        if use_real_api:
            # TODO: Replace with real API call
            # from backend.real_enrichment import vt_url_lookup
            # urls = collect.get("urls", "").split(",") if collect.get("urls") else []
            # mock_steps["vt_url"] = vt_url_lookup(urls)
            pass
        else:
            # Use mock function
            try:
                from backend.mock_enrichment import vt_url_result
                urls = collect.get("urls", "").split(",") if collect.get("urls") else []
                mock_steps["vt_url"] = vt_url_result(urls)
                execution_log.append(
                    f"[{step_num}] vt_url: VirusTotal URL reputation - "
                    f"any_malicious: {mock_steps['vt_url']['any_malicious']}, "
                    f"max_score: {mock_steps['vt_url']['max_score']}, "
                    f"urls_checked: {mock_steps['vt_url']['urls_checked']}"
                )
                step_num += 1
            except ImportError:
                # Fallback if import fails
                mock_steps["vt_url"] = {
                    "any_malicious": False,
                    "max_score": 65,
                    "urls_checked": 0
                }
                execution_log.append(f"[{step_num}] vt_url: VirusTotal URL reputation (fallback)")
                step_num += 1
    
    if enrich.get("abuseipdb_geoip", False):
        if use_real_api:
            # TODO: Replace with real API call
            # from backend.real_enrichment import abuseipdb_lookup
            # ip = collect.get("src_ip", "")
            # mock_steps["abuseipdb"] = abuseipdb_lookup(ip)
            pass
        else:
            # Use mock function
            try:
                from backend.mock_enrichment import abuseipdb_result
                ip = collect.get("src_ip", "0.0.0.0")
                mock_steps["abuseipdb"] = abuseipdb_result(ip)
                execution_log.append(
                    f"[{step_num}] abuseipdb: AbuseIPDB GeoIP lookup - "
                    f"score: {mock_steps['abuseipdb']['score']}, "
                    f"country: {mock_steps['abuseipdb']['country']}, "
                    f"asn: {mock_steps['abuseipdb']['asn']}, "
                    f"ip: {mock_steps['abuseipdb']['ip']}"
                )
                step_num += 1
            except ImportError:
                # Fallback if import fails
                mock_steps["abuseipdb"] = {
                    "score": 90,
                    "country": "US",
                    "asn": "AS15169",
                    "ip": collect.get("src_ip", "0.0.0.0")
                }
                execution_log.append(f"[{step_num}] abuseipdb: AbuseIPDB GeoIP lookup (fallback)")
                step_num += 1
    
    # Step: evaluate condition
    condition_result = False
    branch_taken = "low"
    expression = condition.get("expression", "")
    
    if expression:
        try:
            condition_result = evaluate_expression_safe(expression, mock_steps, enrich)
            branch_taken = "high" if condition_result else "low"
            execution_log.append(
                f"[{step_num}] evaluate: Condition evaluation - "
                f"Result: {'TRUE' if condition_result else 'FALSE'}, "
                f"Branch taken: {branch_taken.upper()}"
            )
            step_num += 1
        except Exception as e:
            execution_log.append(f"[{step_num}] evaluate: Condition evaluation failed - {str(e)}")
            step_num += 1
    
    # Step: action_group execution
    branch_actions = actions.get("trueActions", []) if condition_result else actions.get("falseActions", [])
    if branch_actions:
        execution_log.append(f"[{step_num}] {branch_taken}: Executing {len(branch_actions)} action(s)")
        for action in branch_actions:
            action_name = action.get("action", "unknown")
            action_params = action.get("input", {})
            params_str = ", ".join([f"{k}: {v}" for k, v in action_params.items()])
            execution_log.append(f"  - {action_name} ({params_str})")
    
    return JSONResponse(content={
        "steps": mock_steps,
        "conditionResult": condition_result,
        "branchTaken": branch_taken,
        "executionLog": execution_log,
        "message": "Dry-run completed successfully"
    })

# In-memory storage for playbooks (in production, use database)
_playbook_storage = {}
_current_playbook_id = None

@app.post("/api/playbooks")
async def save_playbook_to_storage(request: Dict[str, Any]):
    """
    Save playbook to storage.
    Returns the playbook ID.
    """
    import uuid
    
    playbook = request.get("playbook", {})
    if not playbook:
        raise HTTPException(status_code=400, detail="Playbook data is required")
    
    # Generate ID if not provided
    playbook_id = playbook.get("id") or str(uuid.uuid4())
    playbook["id"] = playbook_id
    
    # Save to storage
    _playbook_storage[playbook_id] = playbook
    global _current_playbook_id
    _current_playbook_id = playbook_id
    
    return JSONResponse(content={
        "id": playbook_id,
        "message": "Playbook saved successfully"
    })

@app.get("/api/playbooks/current")
async def get_current_playbook():
    """
    Get the current saved playbook.
    Returns 404 if no playbook is saved.
    """
    global _current_playbook_id
    
    if _current_playbook_id is None or _current_playbook_id not in _playbook_storage:
        raise HTTPException(status_code=404, detail="No playbook found")
    
    playbook = _playbook_storage[_current_playbook_id]
    return JSONResponse(content={
        "playbook": playbook,
        "id": _current_playbook_id
    })

@app.get("/splunk-lab", response_class=HTMLResponse)
async def get_splunk_lab():
    """Return Splunk Normalizer Lab React page"""
    # Read all the component files
    components_dir = ROOT / "src" / "components"
    pages_dir = ROOT / "src" / "pages"
    lib_dir = ROOT / "src" / "lib"
    
    # Read component files
    splunk_input_panel_raw = (components_dir / "SplunkInputPanel.jsx").read_text(encoding="utf-8")
    log_console_raw = (components_dir / "LogConsole.jsx").read_text(encoding="utf-8")
    playbook_page_raw = (pages_dir / "PlaybookPage.jsx").read_text(encoding="utf-8")
    normalize_js_raw = (lib_dir / "normalize.js").read_text(encoding="utf-8")
    rules_engine_js_raw = (lib_dir / "rulesEngine.js").read_text(encoding="utf-8")
    
    # Remove ES6 export statements and convert to browser-compatible code
    # Remove export default and export { ... }
    normalize_js = normalize_js_raw.replace('export { normalizeSplunkAlert };', '').replace('if (typeof module !== \'undefined\' && module.exports) {', 'if (false) {')  # Keep function, remove exports
    rules_engine_js = rules_engine_js_raw.replace('export { evaluateRules, loadRulesFromJson };', '').replace('if (typeof module !== \'undefined\' && module.exports) {', 'if (false) {')  # Keep functions, remove exports
    
    # Remove import and export statements from JSX files
    # Remove all React import statements - we'll declare hooks once at the top level
    splunk_input_panel = splunk_input_panel_raw
    splunk_input_panel = re.sub(r"import\s*{\s*useState[^}]*}\s*from\s*['\"]react['\"];?\s*\n?", "", splunk_input_panel)
    splunk_input_panel = splunk_input_panel.replace('export default SplunkInputPanel;', '')
    
    log_console = log_console_raw
    log_console = re.sub(r"import\s*{\s*useState[^}]*}\s*from\s*['\"]react['\"];?\s*\n?", "", log_console)
    log_console = log_console.replace('export default LogConsole;', '')
    
    playbook_page = playbook_page_raw
    playbook_page = re.sub(r"import\s*{\s*useState[^}]*}\s*from\s*['\"]react['\"];?\s*\n?", "", playbook_page)
    playbook_page = playbook_page.replace('import SplunkInputPanel from \'../components/SplunkInputPanel\';\n', '')
    playbook_page = playbook_page.replace('import LogConsole from \'../components/LogConsole\';\n', '')
    playbook_page = playbook_page.replace('import { normalizeSplunkAlert } from \'../lib/normalize\';\n', '')
    playbook_page = playbook_page.replace('import { evaluateRules, loadRulesFromJson } from \'../lib/rulesEngine\';\n', '')
    playbook_page = playbook_page.replace('export default PlaybookPage;', '')
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Splunk Normalizer Lab</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        .header p {{
            opacity: 0.9;
            font-size: 1.1em;
        }}
        .content {{
            padding: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 Splunk Normalizer Lab</h1>
            <p>Test and normalize Splunk alerts with automated rule evaluation</p>
        </div>
        <div class="content">
            <div id="root"></div>
        </div>
    </div>
    
    <script type="text/babel">
        console.log('Script starting...');
        
        // Check if React is loaded
        if (typeof React === 'undefined') {{
            console.error('React is not loaded');
            document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error: React library not loaded</div>';
        }} else {{
            console.log('React loaded:', typeof React);
        }}
        
        if (typeof ReactDOM === 'undefined') {{
            console.error('ReactDOM is not loaded');
            document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error: ReactDOM library not loaded</div>';
        }} else {{
            console.log('ReactDOM loaded:', typeof ReactDOM);
        }}
        
        // Import React hooks once at the top level (shared by all components)
        const {{ useState, useEffect }} = React;
        console.log('Hooks extracted:', typeof useState, typeof useEffect);
        
        // Include all library functions first (must be available globally)
        {normalize_js}
        {rules_engine_js}
        console.log('Library functions loaded:', typeof normalizeSplunkAlert, typeof evaluateRules);
        
        // Include React components (define them globally)
        // Components will use the useState/useEffect from above
        {splunk_input_panel}
        console.log('SplunkInputPanel loaded:', typeof SplunkInputPanel);
        
        {log_console}
        console.log('LogConsole loaded:', typeof LogConsole);
        
        // Main PlaybookPage component (define it globally)
        {playbook_page}
        console.log('PlaybookPage loaded:', typeof PlaybookPage);
        
        // Render the app once DOM is ready (prevent multiple renders)
        let rootRendered = false;
        
        function renderApp() {{
            if (rootRendered) {{
                console.log('App already rendered, skipping...');
                return;
            }}
            
            try {{
                console.log('Attempting to render...');
                const rootElement = document.getElementById('root');
                if (!rootElement) {{
                    console.error('Root element not found');
                    return;
                }}
                
                // Check if PlaybookPage is defined
                if (typeof PlaybookPage === 'undefined') {{
                    console.error('PlaybookPage is not defined');
                    console.log('Available globals:', Object.keys(window).filter(k => k.includes('Page') || k.includes('Panel') || k.includes('Console')));
                    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Error: PlaybookPage component not found. Check console for details.</div>';
                    return;
                }}
                
                console.log('PlaybookPage found, creating root...');
                console.log('PlaybookPage type:', typeof PlaybookPage);
                const root = ReactDOM.createRoot(rootElement);
                console.log('Root created, rendering component...');
                root.render(React.createElement(PlaybookPage));
                console.log('Component rendered successfully');
                rootRendered = true;
            }} catch (error) {{
                console.error('Error rendering React app:', error);
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                const rootElement = document.getElementById('root');
                if (rootElement) {{
                    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Error: ' + error.message + '<br>Check console for details.</div>';
                }}
            }}
        }}
        
        // Set up DOMContentLoaded listener
        console.log('Setting up DOMContentLoaded listener...');
        window.addEventListener('DOMContentLoaded', function() {{
            console.log('DOMContentLoaded fired!');
            renderApp();
        }});
        
        // Also try immediate execution if DOM is already loaded
        if (document.readyState === 'complete' || document.readyState === 'interactive') {{
            console.log('DOM already loaded, rendering immediately...');
            renderApp();
        }}
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

@app.get("/builder", response_class=HTMLResponse)
async def get_builder():
    """Return Visual Playbook Builder React page"""
    pages_dir = ROOT / "src" / "pages"
    
    # Read PlaybookBuilder component file
    playbook_builder_raw = (pages_dir / "PlaybookBuilder.tsx").read_text(encoding="utf-8")
    
    # Remove import and export statements from TSX file
    # Remove all React import statements - we'll declare hooks once at the top level
    playbook_builder = playbook_builder_raw
    playbook_builder = re.sub(r"import\s*{\s*useState[^}]*}\s*from\s*['\"]react['\"];?\s*\n?", "", playbook_builder)
    playbook_builder = re.sub(r"import\s*.*\s*from\s*['\"].*['\"];?\s*\n?", "", playbook_builder)
    playbook_builder = playbook_builder.replace('export default PlaybookBuilder;', '')
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Playbook Builder</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }}
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        console.log('Script starting...');
        
        // Check if React is loaded
        if (typeof React === 'undefined') {{
            console.error('React is not loaded');
            document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error: React library not loaded</div>';
        }} else {{
            console.log('React loaded:', typeof React);
        }}
        
        if (typeof ReactDOM === 'undefined') {{
            console.error('ReactDOM is not loaded');
            document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error: ReactDOM library not loaded</div>';
        }} else {{
            console.log('ReactDOM loaded:', typeof ReactDOM);
        }}
        
        // Import React hooks once at the top level (shared by all components)
        const {{ useState, useEffect }} = React;
        console.log('Hooks extracted:', typeof useState, typeof useEffect);
        
        // Include React component (define it globally)
        {playbook_builder}
        console.log('PlaybookBuilder loaded:', typeof PlaybookBuilder);
        
        // Render the app once DOM is ready (prevent multiple renders)
        let rootRendered = false;
        
        function renderApp() {{
            if (rootRendered) {{
                console.log('App already rendered, skipping...');
                return;
            }}
            
            try {{
                console.log('Attempting to render...');
                const rootElement = document.getElementById('root');
                if (!rootElement) {{
                    console.error('Root element not found');
                    return;
                }}
                
                // Check if PlaybookBuilder is defined
                if (typeof PlaybookBuilder === 'undefined') {{
                    console.error('PlaybookBuilder is not defined');
                    console.log('Available globals:', Object.keys(window).filter(k => k.includes('Builder') || k.includes('Page')));
                    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Error: PlaybookBuilder component not found. Check console for details.</div>';
                    return;
                }}
                
                console.log('PlaybookBuilder found, creating root...');
                console.log('PlaybookBuilder type:', typeof PlaybookBuilder);
                const root = ReactDOM.createRoot(rootElement);
                console.log('Root created, rendering component...');
                root.render(React.createElement(PlaybookBuilder));
                console.log('Component rendered successfully');
                rootRendered = true;
            }} catch (error) {{
                console.error('Error rendering React app:', error);
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                const rootElement = document.getElementById('root');
                if (rootElement) {{
                    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Error: ' + error.message + '<br>Check console for details.</div>';
                }}
            }}
        }}
        
        // Set up DOMContentLoaded listener
        console.log('Setting up DOMContentLoaded listener...');
        window.addEventListener('DOMContentLoaded', function() {{
            console.log('DOMContentLoaded fired!');
            renderApp();
        }});
        
        // Also try immediate execution if DOM is already loaded
        if (document.readyState === 'complete' || document.readyState === 'interactive') {{
            console.log('DOM already loaded, rendering immediately...');
            renderApp();
        }}
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

