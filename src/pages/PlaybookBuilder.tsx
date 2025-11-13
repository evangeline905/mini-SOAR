// ============================================================================
// Unified Expression Evaluation Function
// ============================================================================
/**
 * Unified expression evaluation function that handles:
 * - Automatic removal of outer ${} wrapper
 * - Variable replacement from steps data
 * - Clear error messages for missing variables
 * - Support for both wrapped and unwrapped expressions
 */
function evaluateExpressionUnified(expression, steps, enrichConfig = {}) {
    let evaluated = null; // Initialize outside try block to ensure it's available in catch
    
    try {
        if (!expression || typeof expression !== 'string') {
            throw new Error('Expression must be a non-empty string');
        }

        evaluated = expression.trim();
        
        // Step 1: Remove outer ${} wrapper if present
        const wrappedMatch = evaluated.match(/^\$\{(.+)\}$/);
        if (wrappedMatch) {
            evaluated = wrappedMatch[1];
        }
        
        // Step 2: Check for bare steps. references and convert them to ${steps.xxx} format
        const hasBareSteps = /\bsteps\.\w+/.test(evaluated);
        const hasWrappedSteps = /\$\{steps\./.test(evaluated);
        
        if (hasBareSteps && !hasWrappedSteps) {
            evaluated = evaluated.replace(/\bsteps\.([\w.]+)/g, '${steps.$1}');
        }
        
        // Step 3: Replace all ${steps.xxx} with actual values
        const variablePattern = /\$\{steps\.([\w.]+)\}/g;
        const missingVars = [];
        const replacedVars = [];
        const missingEnrichSteps = [];
        
        evaluated = evaluated.replace(variablePattern, (match, path) => {
            const parts = path.split('.');
            let value = steps;
            
            // Navigate through the path
            for (const part of parts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    // Variable not found
                    missingVars.push(match);
                    
                    // Check if this is because the enrich step is not enabled
                    const enrichStep = parts[0]; // e.g., 'vt_hash', 'vt_url', 'abuseipdb'
                    if (enrichStep === 'vt_hash' && !enrichConfig.vt_hash) {
                        missingEnrichSteps.push('VirusTotal Hash lookup');
                    } else if (enrichStep === 'vt_url' && !enrichConfig.vt_url) {
                        missingEnrichSteps.push('VirusTotal URL reputation');
                    } else if (enrichStep === 'abuseipdb' && !enrichConfig.abuseipdb_geoip) {
                        missingEnrichSteps.push('AbuseIPDB / GeoIP');
                    }
                    
                    return 'null';
                }
            }
            
            replacedVars.push(match);
            
            // Return value in appropriate format for JavaScript evaluation
            if (typeof value === 'boolean') {
                return value.toString();
            } else if (typeof value === 'number') {
                return value.toString();
            } else if (typeof value === 'string') {
                return JSON.stringify(value);
            } else if (value === null || value === undefined) {
                return 'null';
            } else {
                return JSON.stringify(value);
            }
        });
        
        // Step 4: Check for unresolved variables
        const remainingVars = evaluated.match(/\$\{steps\.[\w.]+\}/g);
        if (remainingVars && remainingVars.length > 0) {
            const enrichMsg = missingEnrichSteps.length > 0 
                ? `\n\nPlease enable the following enrich steps: ${missingEnrichSteps.join(', ')}`
                : '';
            throw new Error(
                `Unresolved variables found: ${remainingVars.join(', ')}. ` +
                `These variables may not be available in the test data.${enrichMsg}`
            );
        }
        
        // Step 5: Check for bare steps. references that weren't converted
        const bareStepsMatch = evaluated.match(/\bsteps\.\w+/g);
        if (bareStepsMatch && bareStepsMatch.length > 0) {
            throw new Error(
                `Invalid variable format: ${bareStepsMatch.join(', ')}. ` +
                `Variables must use \${steps.xxx} format.`
            );
        }
        
        // Step 6: Evaluate the expression
        try {
            const result = Function(`"use strict"; return (${evaluated})`)();
            return { success: true, result, evaluated, missingVars, replacedVars };
        } catch (evalError) {
            throw new Error(
                `Expression evaluation failed: ${evalError.message}. ` +
                `Evaluated expression: ${evaluated}`
            );
        }
    } catch (error) {
        return { 
            success: false, 
            error: error.message,
            evaluated: evaluated || expression || ''
        };
    }
}

// ============================================================================
// Components
// ============================================================================

function AlertInputPanel({ setCollect, setAlertJson, setPlaybookName }) {
    const defaultJson = `{
  "sid": "phish_sim_001",
  "timestamp": "2025-11-11T15:00:00Z",
  "result": {
    "sender": "badguy@malicious.com",
    "recipient": "victim@example.com",
    "subject": "Important invoice attached",
    "urls": ["http://malicious.example/download", "https://suspicious.example/login"],
    "attachments": [{"name": "invoice.docm", "content_base64": ""}],
    "attachment_hashes": ["3f786850e387550fdab836ed7e6dc881de23001b"],
    "src_ip": "203.0.113.45",
    "severity": "Medium"
  }
}`;
    
    const [jsonInput, setJsonInput] = useState(defaultJson);
    
    // Update alertJson in parent when jsonInput changes
    useEffect(() => {
        if (setAlertJson) {
            setAlertJson(jsonInput);
        }
    }, [jsonInput, setAlertJson]);

    const inferPlaybookNameFromAlert = (alert) => {
        const type =
            alert?.result?.type ||
            alert?.result?.alert_type ||
            alert?.result?.rule_name ||
            alert?.type;

        if (type && typeof type === 'string') {
            return `${type} Playbook`; // 例如 "Phishing Email Playbook"
        }

        return 'Untitled Playbook';
    };

    const handleLoadIntoCollect = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const result = parsed.result || {};
            
            // Map result fields to collect mapping
            const newCollect = {
                sender: result.sender || '',
                recipient: result.recipient || '',
                subject: result.subject || '',
                urls: Array.isArray(result.urls) ? result.urls.join(', ') : (result.urls || ''),
                attachment_hashes: Array.isArray(result.attachment_hashes) 
                    ? result.attachment_hashes.join(', ') 
                    : (result.attachment_hashes || ''),
                src_ip: result.src_ip || ''
            };
            
            setCollect(newCollect);
            
            // Infer and update playbook name from alert
            const inferredName = inferPlaybookNameFromAlert(parsed);
            if (setPlaybookName) {
                setPlaybookName(inferredName);
            }
            
            alert('Alert data loaded into Collect mapping successfully!');
        } catch (error) {
            alert('Error parsing JSON: ' + error.message);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Alert Input</h3>
            
            {/* JSON Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Alert JSON</label>
                <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter alert JSON here..."
                />
            </div>

            {/* Load Button */}
            <button
                onClick={handleLoadIntoCollect}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
            >
                Load into Collect
            </button>
        </div>
    );
}

function TriggerPlaybookInfoPanel({ triggerSource, setTriggerSource, playbookName, setPlaybookName }) {
    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Trigger / Playbook Info</h3>
            
            {/* Trigger Source */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Source</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => setTriggerSource('manual')}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                            triggerSource === 'manual'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        Manual Input
                    </button>
                    <button
                        disabled
                        className="flex-1 px-4 py-2 rounded-lg font-medium transition bg-gray-200 text-gray-400 cursor-not-allowed"
                    >
                        SIEM Alert
                    </button>
                </div>
            </div>

            {/* Playbook Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Playbook Name</label>
                <input
                    type="text"
                    value={playbookName}
                    onChange={(e) => setPlaybookName(e.target.value)}
                    placeholder="e.g. Phishing Email Playbook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    );
}

function CollectPanel({ collect, setCollect, alertJson }) {
    const [localCollect, setLocalCollect] = useState(collect);

    // Update local state when collect prop changes
    useEffect(() => {
        setLocalCollect(collect);
    }, [collect]);

    const handleFieldChange = (field, value) => {
        setLocalCollect({ ...localCollect, [field]: value });
    };

    const handleApplyMapping = () => {
        setCollect(localCollect);
        alert('Mapping applied successfully!');
    };


    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Collect</h3>
            
            <div className="space-y-3">
                {/* Sender */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender</label>
                    <input
                        type="text"
                        value={localCollect.sender}
                        onChange={(e) => handleFieldChange('sender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="sender field mapping"
                    />
                </div>

                {/* Recipient */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                    <input
                        type="text"
                        value={localCollect.recipient}
                        onChange={(e) => handleFieldChange('recipient', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="recipient field mapping"
                    />
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                        type="text"
                        value={localCollect.subject}
                        onChange={(e) => handleFieldChange('subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="subject field mapping"
                    />
                </div>

                {/* URLs */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URLs</label>
                    <textarea
                        value={localCollect.urls}
                        onChange={(e) => handleFieldChange('urls', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        rows="2"
                        placeholder="urls field mapping (comma-separated)"
                    />
                </div>

                {/* Attachment Hashes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachment Hashes</label>
                    <textarea
                        value={localCollect.attachment_hashes}
                        onChange={(e) => handleFieldChange('attachment_hashes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        rows="2"
                        placeholder="attachment_hashes field mapping (comma-separated)"
                    />
                </div>

                {/* Source IP */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source IP</label>
                    <input
                        type="text"
                        value={localCollect.src_ip}
                        onChange={(e) => handleFieldChange('src_ip', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="src_ip field mapping"
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleApplyMapping}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function EnrichPanel({ enrich, setEnrich }) {
    const toggleEnrich = (field) => {
        setEnrich({ ...enrich, [field]: !enrich[field] });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Enrich</h3>
            
            <div className="space-y-3">
                {/* VirusTotal Hash Lookup */}
                <div
                    onClick={() => toggleEnrich('vt_hash')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        enrich.vt_hash
                            ? 'bg-blue-50 border-blue-500 shadow-md'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                enrich.vt_hash
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-400'
                            }`}>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-800">VirusTotal — Hash lookup</h4>
                                <p className="text-xs text-gray-500">Check file hashes against VirusTotal database</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VirusTotal URL Reputation */}
                <div
                    onClick={() => toggleEnrich('vt_url')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        enrich.vt_url
                            ? 'bg-blue-50 border-blue-500 shadow-md'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                enrich.vt_url
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-400'
                            }`}>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-800">VirusTotal — URL reputation</h4>
                                <p className="text-xs text-gray-500">Check URLs against VirusTotal reputation database</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AbuseIPDB / GeoIP */}
                <div
                    onClick={() => toggleEnrich('abuseipdb_geoip')}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        enrich.abuseipdb_geoip
                            ? 'bg-green-50 border-green-500 shadow-md'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                enrich.abuseipdb_geoip
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-white border-gray-400'
                            }`}>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-800">AbuseIPDB / GeoIP</h4>
                                <p className="text-xs text-gray-500">Check IP addresses and get geographic information</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mock Mode Notice */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                    <span className="font-semibold">ℹ️ Mock Mode:</span> Currently using mock data. Real API integration will be available soon.
                </p>
            </div>
        </div>
    );
}

function ConditionPanel({ condition, setCondition, config, onMockResultsGenerated, mockResults }) {
    const [localExpression, setLocalExpression] = useState(
        condition.expression || '${steps.vt_hash.any_malicious == true || steps.vt_url.max_score >= 70 || steps.abuseipdb.score >= 85}'
    );
    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [showStepsData, setShowStepsData] = useState(false);

    // Update local expression when condition prop changes
    useEffect(() => {
        if (condition.expression) {
            setLocalExpression(condition.expression);
        }
    }, [condition.expression]);

    const handleExpressionChange = (value) => {
        setLocalExpression(value);
        setCondition({ expression: value });
    };

    const insertVariable = (variable) => {
        const textarea = document.querySelector('#condition-expression');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = localExpression;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + variable + after;
            handleExpressionChange(newText);
            
            // Set cursor position after inserted variable
            setTimeout(() => {
                textarea.focus();
                const newPos = start + variable.length;
                textarea.setSelectionRange(newPos, newPos);
            }, 0);
        } else {
            handleExpressionChange(localExpression + variable);
        }
    };

    const handleTestExpression = async (onMockResultsGenerated, mockResults) => {
        setIsTesting(true);
        setTestResult(null);
        setShowStepsData(false); // Reset expand state when starting new test

        try {
            let steps;
            
            // Check if we can reuse existing mock results
            if (mockResults && mockResults.steps) {
                // Reuse existing mock results
                if (onMockResultsGenerated) {
                    onMockResultsGenerated(mockResults.steps, 'reused');
                }
                steps = mockResults.steps;
            } else {
                // Generate new mock results
                const response = await fetch('/api/playbooks/dryrun', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        config: config || {
                            enrich: { vt_hash: true, vt_url: true, abuseipdb_geoip: true },
                            collect: {},
                            condition: { expression: localExpression },
                            actions: {}
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                steps = data.steps || {};

                // Save mock results if callback provided
                if (onMockResultsGenerated) {
                    onMockResultsGenerated(steps, 'generated');
                }
            }

            // Evaluate expression with mock data using unified function
            const evalResult = evaluateExpressionUnified(localExpression, steps, config.enrich || {});
            
            if (evalResult.success) {
                setTestResult({
                    success: true,
                    result: evalResult.result,
                    steps: steps,
                    evaluated: evalResult.evaluated
                });
                // Auto-expand "View steps data" after successful test
                setShowStepsData(true);
            } else {
                setTestResult({
                    success: false,
                    error: evalResult.error,
                    steps: steps
                });
                // Also expand on error to show steps data
                setShowStepsData(true);
            }
        } catch (error) {
            setTestResult({
                success: false,
                error: error.message
            });
        } finally {
            setIsTesting(false);
        }
    };

    const variables = [
        '${steps.vt_hash.any_malicious}',
        '${steps.vt_hash.max_score}',
        '${steps.vt_url.any_malicious}',
        '${steps.vt_url.max_score}',
        '${steps.abuseipdb.score}'
    ];

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Condition</h3>
            
            <div className="space-y-3">
                {/* Expression Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expression</label>
                    <textarea
                        id="condition-expression"
                        value={localExpression}
                        onChange={(e) => handleExpressionChange(e.target.value)}
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        placeholder="Enter condition expression..."
                    />
                </div>

                {/* Insert Variable Buttons */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Insert Variable</label>
                    <div className="flex flex-wrap gap-2">
                        {variables.map((variable, index) => (
                            <button
                                key={index}
                                onClick={() => insertVariable(variable)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono rounded border border-gray-300 transition"
                            >
                                {variable}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Test Button */}
                <button
                    onClick={() => handleTestExpression(onMockResultsGenerated, mockResults)}
                    disabled={isTesting}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isTesting ? 'Testing...' : 'Test expression'}
                </button>

                {/* Test Result */}
                {testResult && (
                    <div className={`p-3 rounded-lg border-2 ${
                        testResult.success
                            ? (testResult.result 
                                ? 'bg-green-50 border-green-500' 
                                : 'bg-red-50 border-red-500')
                            : 'bg-yellow-50 border-yellow-500'
                    }`}>
                        {testResult.success ? (
                            <div>
                                <p className="text-sm font-semibold mb-1">
                                    Result: <span className={testResult.result ? 'text-green-700' : 'text-red-700'}>
                                        {testResult.result ? 'TRUE' : 'FALSE'}
                                    </span>
                                </p>
                                {testResult.steps && (
                                    <details 
                                        className="mt-2" 
                                        open={showStepsData}
                                        onToggle={(e) => {
                                            // Sync state with details element's open state
                                            setShowStepsData(e.target.open);
                                        }}
                                    >
                                        <summary className="text-xs text-gray-600 cursor-pointer">
                                            View steps data
                                        </summary>
                                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-32">
                                            {JSON.stringify(testResult.steps, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-yellow-800">
                                <span className="font-semibold">Error:</span> {testResult.error}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionsPanel({ actions, setActions, collect }) {
    const availableActions = [
        { id: 'mail.quarantine', label: 'Mail Quarantine', params: [] },
        { id: 'identity.suspend_user', label: 'Suspend User', params: [] },
        { id: 'firewall.block_ip', label: 'Block IP', params: [{ key: 'ip', label: 'IP Address', type: 'text', default: '${steps.collect.src_ip}' }] },
        { id: 'notify.email', label: 'Notify Email', params: [{ key: 'email', label: 'Email Address', type: 'text', default: '' }] },
        { id: 'ticket.create', label: 'Create Ticket', params: [{ key: 'title', label: 'Ticket Title', type: 'text', default: '' }, { key: 'description', label: 'Description', type: 'textarea', default: '' }] }
    ];

    const toggleAction = (branch, actionId) => {
        const branchActions = actions[branch] || [];
        const existingIndex = branchActions.findIndex(a => a.action === actionId);
        
        if (existingIndex >= 0) {
            // Remove action
            const newActions = branchActions.filter((_, i) => i !== existingIndex);
            setActions({ ...actions, [branch]: newActions });
        } else {
            // Add action with default input
            const actionDef = availableActions.find(a => a.id === actionId);
            const newAction = {
                id: `${branch}_${actionId}_${Date.now()}`,
                action: actionId,
                input: actionDef.params.reduce((acc, param) => {
                    acc[param.key] = param.default || '';
                    return acc;
                }, {})
            };
            setActions({ ...actions, [branch]: [...branchActions, newAction] });
        }
    };

    const updateActionInput = (branch, actionId, key, value) => {
        const branchActions = actions[branch] || [];
        const updatedActions = branchActions.map(a => {
            if (a.id === actionId) {
                return {
                    ...a,
                    input: { ...a.input, [key]: value }
                };
            }
            return a;
        });
        setActions({ ...actions, [branch]: updatedActions });
    };

    const isActionSelected = (branch, actionId) => {
        return (actions[branch] || []).some(a => a.action === actionId);
    };

    const getActionInstance = (branch, actionId) => {
        return (actions[branch] || []).find(a => a.action === actionId);
    };

    const renderActionCard = (action, branch) => {
        const isSelected = isActionSelected(branch, action.id);
        const actionInstance = getActionInstance(branch, action.id);

        return (
            <div key={action.id} className="border border-gray-300 rounded-lg overflow-hidden">
                <div
                    onClick={() => toggleAction(branch, action.id)}
                    className={`p-3 cursor-pointer transition-all ${
                        isSelected
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'bg-white hover:bg-gray-50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-400'
                            }`}>
                            </div>
                            <span className="font-medium text-gray-800">{action.label}</span>
                        </div>
                    </div>
                </div>
                
                {/* Expandable Parameters Form */}
                {isSelected && action.params.length > 0 && actionInstance && (
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                        {action.params.map((param) => (
                            <div key={param.key} className="mb-3 last:mb-0">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {param.label}
                                </label>
                                {param.type === 'textarea' ? (
                                    <textarea
                                        value={actionInstance.input[param.key] || ''}
                                        onChange={(e) => updateActionInput(branch, actionInstance.id, param.key, e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                                        rows="2"
                                        placeholder={param.default}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={actionInstance.input[param.key] || ''}
                                        onChange={(e) => updateActionInput(branch, actionInstance.id, param.key, e.target.value)}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                        placeholder={param.default}
                                    />
                                )}
                                {param.default && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Default: <code className="bg-gray-200 px-1 rounded">{param.default}</code>
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
                {/* True Branch */}
                <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-2">True Branch Actions</h4>
                    <div className="space-y-2">
                        {availableActions.map(action => renderActionCard(action, 'trueActions'))}
                    </div>
                </div>

                {/* False Branch */}
                <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2">False Branch Actions</h4>
                    <div className="space-y-2">
                        {availableActions.map(action => renderActionCard(action, 'falseActions'))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Generate instance YAML from current configuration
 * This function creates a fully instantiated playbook (runbook) from the builder state
 */
function generateInstanceYaml(config) {
    const steps = [];
    const enrichStepIds = [];

    // Step 1: collect (collect_normalize)
    const collectMapping = {};
    if (config.collect.sender) collectMapping.sender = config.collect.sender;
    if (config.collect.recipient) collectMapping.recipient = config.collect.recipient;
    if (config.collect.subject) collectMapping.subject = config.collect.subject;
    if (config.collect.urls) collectMapping.urls = config.collect.urls;
    if (config.collect.attachment_hashes) collectMapping.attachment_hashes = config.collect.attachment_hashes;
    if (config.collect.src_ip) collectMapping.src_ip = config.collect.src_ip;

    const collectStep = {
        id: 'collect',
        type: 'collect_normalize',
        params: Object.keys(collectMapping).length > 0 ? { mapping: collectMapping } : {},
        next: null
    };
    steps.push(collectStep);

    // Step 2: Enrich steps (only enabled ones)
    if (config.enrich.vt_hash) {
        const vtHashStep = {
            id: 'vt_hash',
            type: 'vt_hash_lookup',
            params: {
                hashes: '${steps.collect.attachment_hashes}'
            },
            next: 'evaluate'
        };
        steps.push(vtHashStep);
        enrichStepIds.push('vt_hash');
    }

    if (config.enrich.vt_url) {
        const vtUrlStep = {
            id: 'vt_url',
            type: 'vt_url_reputation',
            params: {
                urls: '${steps.collect.urls}'
            },
            next: 'evaluate'
        };
        steps.push(vtUrlStep);
        enrichStepIds.push('vt_url');
    }

    if (config.enrich.abuseipdb_geoip) {
        const abuseipdbStep = {
            id: 'abuseipdb',
            type: 'abuseipdb_lookup',
            params: {
                ip: '${steps.collect.src_ip}'
            },
            next: 'evaluate'
        };
        steps.push(abuseipdbStep);
        enrichStepIds.push('abuseipdb');
    }

    // Set collect.next: if there are enrich steps, point to first one (parallel execution)
    // Otherwise, point directly to evaluate
    if (enrichStepIds.length > 0) {
        collectStep.next = enrichStepIds; // Array for parallel execution
    } else {
        collectStep.next = 'evaluate';
    }

    // Step 3: evaluate (condition)
    const evaluateStep = {
        id: 'evaluate',
        type: 'condition',
        params: {
            expression: config.condition.expression || '' // Keep original expression with ${}
        },
        true_next: 'high',
        false_next: 'low'
    };
    steps.push(evaluateStep);

    // Step 4: action_group high (trueActions)
    const highActions = config.actions.trueActions.map(action => {
        const actionObj = {
            action: action.action,
            input: {}
        };

        // Map common actions to their input parameters
        switch (action.action) {
            case 'mail.quarantine':
                actionObj.input.message_id = '${alert.alert_id}';
                break;
            case 'identity.suspend_user':
                actionObj.input.user = '${steps.collect.sender}';
                break;
            case 'firewall.block_ip':
                actionObj.input.ip = '${steps.collect.src_ip}';
                break;
            case 'notify.email':
                if (action.input) {
                    Object.assign(actionObj.input, action.input);
                }
                break;
            case 'ticket.create':
                if (action.input) {
                    Object.assign(actionObj.input, action.input);
                }
                break;
            default:
                // For other actions, use the input from UI
                if (action.input) {
                    Object.assign(actionObj.input, action.input);
                }
        }

        return actionObj;
    });

    const highActionGroup = {
        id: 'high',
        type: 'action_group',
        params: {
            actions: highActions
        }
    };
    steps.push(highActionGroup);

    // Step 5: action_group low (falseActions)
    const lowActions = config.actions.falseActions.map(action => {
        const actionObj = {
            action: action.action,
            input: {}
        };

        // Map common actions to their input parameters
        switch (action.action) {
            case 'mail.quarantine':
                actionObj.input.message_id = '${alert.alert_id}';
                break;
            case 'identity.suspend_user':
                actionObj.input.user = '${steps.collect.sender}';
                break;
            case 'firewall.block_ip':
                actionObj.input.ip = '${steps.collect.src_ip}';
                break;
            case 'notify.email':
                if (action.input) {
                    Object.assign(actionObj.input, action.input);
                }
                break;
            case 'ticket.create':
                if (action.input) {
                    Object.assign(actionObj.input, action.input);
                }
                break;
            default:
                // For other actions, use the input from UI
                if (action.input) {
                    Object.assign(actionObj.input, action.input);
                }
        }

        return actionObj;
    });

    const lowActionGroup = {
        id: 'low',
        type: 'action_group',
        params: {
            actions: lowActions
        }
    };
    steps.push(lowActionGroup);

    // Build YAML structure
    const yamlStructure = {
        name: config.name || 'Untitled Playbook',
        steps: steps
    };

    // Convert to YAML string
    return convertToYaml(yamlStructure);
}

function convertToYaml(obj, indent = 0) {
    // Ensure we always return a string
    if (obj === null || obj === undefined) {
        return '';
    }
    
    const indentStr = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
        obj.forEach((item) => {
            if (typeof item === 'object' && item !== null) {
                yaml += `${indentStr}- `;
                const itemYaml = convertToYaml(item, indent + 1);
                const lines = itemYaml.split('\n').filter(l => l.trim());
                if (lines.length > 0) {
                    yaml += lines[0].replace(/^  +/, '') + '\n';
                    lines.slice(1).forEach(line => {
                        if (line.trim()) {
                            yaml += indentStr + '  ' + line.replace(/^  +/, '') + '\n';
                        }
                    });
                }
            } else {
                yaml += `${indentStr}- ${item}\n`;
            }
        });
    } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
            const value = obj[key];
            if (value === null || value === undefined) {
                yaml += `${indentStr}${key}: null\n`;
            } else if (Array.isArray(value)) {
                yaml += `${indentStr}${key}:\n`;
                yaml += convertToYaml(value, indent + 1);
            } else if (typeof value === 'object') {
                yaml += `${indentStr}${key}:\n`;
                yaml += convertToYaml(value, indent + 1);
            } else if (typeof value === 'string') {
                const strValue = String(value);
                // For expression strings with ${}, use quoted format
                if (strValue.includes('${') && !strValue.includes('\n')) {
                    yaml += `${indentStr}${key}: "${strValue.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
                } else if (strValue.includes('\n')) {
                    // Multi-line strings use literal block
                    yaml += `${indentStr}${key}: |\n`;
                    const lines = strValue.split('\n');
                    lines.forEach(line => {
                        yaml += `${indentStr}  ${line}\n`;
                    });
                } else {
                    // Quote strings that contain special characters
                    if (strValue.includes(':') || strValue.includes('|') || strValue.includes('&') || strValue.includes('*') || strValue.includes('#')) {
                        yaml += `${indentStr}${key}: "${strValue.replace(/"/g, '\\"')}"\n`;
                    } else {
                        yaml += `${indentStr}${key}: ${strValue}\n`;
                    }
                }
            } else {
                const strValue = String(value);
                yaml += `${indentStr}${key}: ${strValue}\n`;
            }
        });
    } else {
        yaml += `${obj}\n`;
    }

    return yaml;
}

/**
 * Generate template YAML from instance YAML
 * Replaces all IOC data (emails, URLs, IPs, hashes) with placeholders
 */
function generateTemplateYaml(instanceYaml) {
    // Ensure instanceYaml is a string
    if (!instanceYaml) {
        return '';
    }
    
    // Convert to string if it's not already
    let templateYaml = typeof instanceYaml === 'string' ? instanceYaml : String(instanceYaml);
    
    if (templateYaml.trim() === '') {
        return '';
    }

    // Email regex: \b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    
    // Replace emails - try to determine if it's sender or recipient based on context
    templateYaml = String(templateYaml).replace(emailRegex, (match, offset, string) => {
        // Ensure string is actually a string
        const str = typeof string === 'string' ? string : String(templateYaml);
        // Check context: if preceded by "sender" or similar, use sender placeholder
        const beforeMatch = str.substring(Math.max(0, offset - 20), offset).toLowerCase();
        if (beforeMatch.includes('sender') || beforeMatch.includes('from')) {
            return '${alert.result.sender}';
        } else if (beforeMatch.includes('recipient') || beforeMatch.includes('to')) {
            return '${alert.result.recipient}';
        }
        // Default to sender
        return '${alert.result.sender}';
    });

    // URL regex: https?://[^\s"']+ (but not in ${} expressions)
    const urlRegex = /https?:\/\/[^\s"'`]+/g;
    templateYaml = String(templateYaml).replace(urlRegex, (match, offset, string) => {
        // Ensure string is actually a string
        const str = typeof string === 'string' ? string : String(templateYaml);
        // Don't replace if it's inside a ${} expression
        const beforeMatch = str.substring(Math.max(0, offset - 20), offset);
        const afterMatch = str.substring(offset + match.length, Math.min(str.length, offset + match.length + 10));
        // Check if we're inside a ${...} expression
        const lastOpen = beforeMatch.lastIndexOf('${');
        const lastClose = beforeMatch.lastIndexOf('}');
        if (lastOpen > lastClose) {
            // We're inside an expression, check if it closes after this match
            if (!afterMatch.includes('}')) {
                return match; // Keep original if inside expression
            }
        }
        // Also check if it's part of an expression variable
        if (beforeMatch.includes('steps.') || beforeMatch.includes('alert.')) {
            return match; // Keep original if it's part of a variable path
        }
        return '${alert.result.urls}';
    });

    // IP regex: \b\d{1,3}(\.\d{1,3}){3}\b (but not in ${} expressions)
    const ipRegex = /\b\d{1,3}(\.\d{1,3}){3}\b/g;
    templateYaml = String(templateYaml).replace(ipRegex, (match, offset, string) => {
        // Ensure string is actually a string
        const str = typeof string === 'string' ? string : String(templateYaml);
        // Don't replace if it's inside a ${} expression
        const beforeMatch = str.substring(Math.max(0, offset - 20), offset);
        const afterMatch = str.substring(offset + match.length, Math.min(str.length, offset + match.length + 10));
        // Check if we're inside a ${...} expression
        const lastOpen = beforeMatch.lastIndexOf('${');
        const lastClose = beforeMatch.lastIndexOf('}');
        if (lastOpen > lastClose) {
            // We're inside an expression, check if it closes after this match
            if (!afterMatch.includes('}')) {
                return match; // Keep original if inside expression
            }
        }
        // Also check if it's part of an expression variable like steps.collect.src_ip
        if (beforeMatch.includes('steps.') || beforeMatch.includes('alert.')) {
            return match; // Keep original if it's part of a variable path
        }
        return '${alert.result.src_ip}';
    });

    // Hash regex: [A-Fa-f0-9]{32,64} (but not in ${} expressions)
    const hashRegex = /\b[A-Fa-f0-9]{32,64}\b/g;
    templateYaml = String(templateYaml).replace(hashRegex, (match, offset, string) => {
        // Ensure string is actually a string
        const str = typeof string === 'string' ? string : String(templateYaml);
        // Don't replace if it's inside a ${} expression
        const beforeMatch = str.substring(Math.max(0, offset - 20), offset);
        const afterMatch = str.substring(offset + match.length, Math.min(str.length, offset + match.length + 10));
        // Check if we're inside a ${...} expression
        const lastOpen = beforeMatch.lastIndexOf('${');
        const lastClose = beforeMatch.lastIndexOf('}');
        if (lastOpen > lastClose) {
            // We're inside an expression, check if it closes after this match
            if (!afterMatch.includes('}')) {
                return match; // Keep original if inside expression
            }
        }
        // Also check if it's part of an expression variable
        if (beforeMatch.includes('steps.') || beforeMatch.includes('alert.')) {
            return match; // Keep original if it's part of a variable path
        }
        return '${alert.result.attachment_hashes}';
    });

    // Replace other string values in mapping/params (but keep structure)
    // Process line by line to handle YAML structure better
    const lines = templateYaml.split('\n');
    const processedLines = lines.map((line, lineIndex) => {
        // Skip lines that are already placeholders or expressions
        if (line.includes('${') || line.includes('alert.') || line.includes('steps.')) {
            return line;
        }

        // Match YAML key-value pairs in mapping sections
        // Pattern: spaces + key + : + value
        const mappingLineRegex = /^(\s+)(sender|recipient|subject|text|comment|message|description|summary|hashes|urls|ip):\s+(.+)$/;
        const match = line.match(mappingLineRegex);
        
        if (match) {
            const [, indent, key, value] = match;
            // If value is already a placeholder or expression, keep it
            if (value.includes('${') || value.includes('alert.') || value.includes('steps.')) {
                return line;
            }
            // If value is quoted, replace with quoted empty string
            if (value.startsWith('"') && value.endsWith('"')) {
                return `${indent}${key}: ""`;
            }
            // If value is unquoted, replace with empty string
            return `${indent}${key}: ""`;
        }

        // Handle quoted strings that aren't in key-value pairs
        const quotedStringRegex = /"([^"]*)"/g;
        return line.replace(quotedStringRegex, (match, content) => {
            // If it's already a placeholder or expression, keep it
            if (content.includes('${') || content.includes('alert.') || content.includes('steps.')) {
                return match;
            }
            // If it's empty or just whitespace, keep as is
            if (!content.trim()) {
                return '""';
            }
            // Replace with empty string for other values
            return '""';
        });
    });

    templateYaml = processedLines.join('\n');

    return templateYaml;
}

/**
 * Wrapper component to provide instance YAML to PlaybookTemplateWindow
 */
function PlaybookTemplateWindowWithYaml({ config }) {
    // Generate instance YAML from config
    const instanceYaml = generateInstanceYaml(config);
    
    // Ensure instanceYaml is a string
    const instanceYamlString = typeof instanceYaml === 'string' ? instanceYaml : (instanceYaml ? String(instanceYaml) : '');
    
    return <PlaybookTemplateWindow instanceYaml={instanceYamlString} />;
}

function YamlPreviewPanel({ config, mockResults, onMockResultsGenerated }) {
    const [dryRunResults, setDryRunResults] = useState(null);
    const [isRunningDryRun, setIsRunningDryRun] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Real-time YAML generation: regenerate whenever config changes
    const [yamlContent, setYamlContent] = useState('');
    
    // Update YAML whenever config changes
    useEffect(() => {
        const generated = generateInstanceYaml(config);
        setYamlContent(generated);
    }, [config]);

    // Listen for dry-run complete event from toolbar
    useEffect(() => {
        const handleDryRunComplete = (event) => {
            const data = event.detail;
            setDryRunResults({
                steps: data.steps || {},
                conditionResult: data.conditionResult,
                branch: data.branchTaken ? data.branchTaken.toUpperCase() : 'LOW',
                executionLog: data.executionLog || []
            });
            setIsExpanded(true);
        };

        window.addEventListener('dryrun-complete', handleDryRunComplete);
        return () => {
            window.removeEventListener('dryrun-complete', handleDryRunComplete);
        };
    }, []);


    const handleDryRun = async () => {
        setIsRunningDryRun(true);
        setDryRunResults(null);
        
        try {
            let data;
            let steps;
            
            // Check if we can reuse existing mock results
            if (mockResults && mockResults.steps) {
                // Reuse existing mock results
                if (onMockResultsGenerated) {
                    onMockResultsGenerated(mockResults.steps, 'reused');
                }
                steps = mockResults.steps;
            } else {
                // Generate new mock results
                const response = await fetch('/api/playbooks/dryrun', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        playbook: yamlContent,
                        config: config
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                data = await response.json();
                steps = data.steps || {};
                
                // Save mock results
                if (onMockResultsGenerated) {
                    onMockResultsGenerated(steps, 'generated');
                }
            }
            
            // Evaluate condition using unified function
            const evalResult = evaluateExpressionUnified(
                config.condition?.expression || '', 
                steps, 
                config.enrich || {}
            );
            
            let conditionResult = false;
            if (evalResult.success) {
                conditionResult = evalResult.result;
            } else {
                console.error('Error evaluating condition:', evalResult.error);
            }
            
            // Build execution log
            const executionLog = [];
            executionLog.push('[1] collect_normalize: Collecting and normalizing alert data');
            
            if (config.enrich.vt_hash) {
                executionLog.push(`[2] vt_hash: VirusTotal hash lookup - any_malicious: ${steps.vt_hash?.any_malicious || false}, max_score: ${steps.vt_hash?.max_score || 0}`);
            }
            if (config.enrich.vt_url) {
                executionLog.push(`[${2 + (config.enrich.vt_hash ? 1 : 0)}] vt_url: VirusTotal URL reputation - any_malicious: ${steps.vt_url?.any_malicious || false}, max_score: ${steps.vt_url?.max_score || 0}`);
            }
            if (config.enrich.abuseipdb_geoip) {
                executionLog.push(`[${2 + (config.enrich.vt_hash ? 1 : 0) + (config.enrich.vt_url ? 1 : 0)}] abuseipdb: AbuseIPDB GeoIP lookup - score: ${steps.abuseipdb?.score || 0}`);
            }
            
            const evaluateStepNum = 2 + (config.enrich.vt_hash ? 1 : 0) + (config.enrich.vt_url ? 1 : 0) + (config.enrich.abuseipdb_geoip ? 1 : 0);
            executionLog.push(`[${evaluateStepNum}] evaluate: Condition evaluation - Result: ${conditionResult ? 'TRUE' : 'FALSE'}`);
            
            const branch = conditionResult ? 'high' : 'low';
            const branchActions = conditionResult ? config.actions.trueActions : config.actions.falseActions;
            if (branchActions.length > 0) {
                executionLog.push(`[${evaluateStepNum + 1}] ${branch}: Executing ${branchActions.length} action(s)`);
                branchActions.forEach((action, idx) => {
                    executionLog.push(`  - ${action.action} (${Object.keys(action.input).map(k => `${k}: ${action.input[k]}`).join(', ')})`);
                });
            }
            
            setDryRunResults({
                steps: steps,
                conditionResult: conditionResult,
                branch: branch.toUpperCase(),
                executionLog: executionLog,
                error: evalResult.success ? null : evalResult.error
            });
            setIsExpanded(true);
        } catch (error) {
            setDryRunResults({
                error: error.message
            });
        } finally {
            setIsRunningDryRun(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Runbook</h3>
            </div>

            {/* Status indicator */}
            <p className="text-sm text-gray-500 mt-1 mb-2">
                Runbook — auto-generated from current selections
            </p>

            {/* Read-only YAML preview */}
            <div className="bg-gray-900 rounded p-4 mb-4">
                <pre className="text-sm text-green-400 font-mono overflow-x-auto max-h-96">
                    <code>{yamlContent || 'Generating YAML...'}</code>
                </pre>
            </div>

            {/* Dry-run Results */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-md font-semibold text-gray-700">Dry-run Results</h4>
                    <button
                        onClick={handleDryRun}
                        disabled={isRunningDryRun}
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isRunningDryRun ? 'Running...' : 'Run Dry-run'}
                    </button>
                </div>
                
                {dryRunResults && (
                    <div className="bg-gray-50 rounded p-3 border border-gray-200">
                        {dryRunResults.error ? (
                            <p className="text-sm text-red-600">Error: {dryRunResults.error}</p>
                        ) : (
                            <div className="space-y-3">
                                {/* Enrich Results Summary */}
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Enrich Results:</h5>
                                    <div className="space-y-1 text-xs font-mono bg-white p-2 rounded">
                                        {dryRunResults.steps.vt_hash && (
                                            <div>
                                                <span className="text-blue-600">vt_hash:</span> any_malicious={String(dryRunResults.steps.vt_hash.any_malicious)}, max_score={dryRunResults.steps.vt_hash.max_score}
                                            </div>
                                        )}
                                        {dryRunResults.steps.vt_url && (
                                            <div>
                                                <span className="text-blue-600">vt_url:</span> any_malicious={String(dryRunResults.steps.vt_url.any_malicious)}, max_score={dryRunResults.steps.vt_url.max_score}
                                            </div>
                                        )}
                                        {dryRunResults.steps.abuseipdb && (
                                            <div>
                                                <span className="text-green-600">abuseipdb:</span> score={dryRunResults.steps.abuseipdb.score}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Condition Result */}
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Condition Evaluation:</h5>
                                    {dryRunResults.error ? (
                                        <div className="p-2 rounded bg-yellow-100 border border-yellow-300">
                                            <p className="text-sm font-semibold text-yellow-800">Evaluation Error:</p>
                                            <p className="text-xs text-yellow-700 mt-1 whitespace-pre-wrap">{dryRunResults.error}</p>
                                        </div>
                                    ) : (
                                        <div className={`p-2 rounded ${
                                            dryRunResults.conditionResult
                                                ? 'bg-green-100 border border-green-300'
                                                : 'bg-red-100 border border-red-300'
                                        }`}>
                                            <p className="text-sm font-semibold">
                                                Result: <span className={dryRunResults.conditionResult ? 'text-green-700' : 'text-red-700'}>
                                                    {dryRunResults.conditionResult ? 'TRUE' : 'FALSE'}
                                                </span>
                                            </p>
                                            <p className="text-sm mt-1">
                                                Branch taken: <span className="font-semibold">{dryRunResults.branch}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Execution Log */}
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Execution Log:</h5>
                                    <div className="bg-white p-2 rounded border border-gray-300 max-h-48 overflow-y-auto">
                                        <div className="space-y-1">
                                            {dryRunResults.executionLog.map((log, idx) => (
                                                <div key={idx} className="text-xs font-mono text-gray-700">
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Playbook Template Window Component
 * Auto-generated template from current instance YAML
 */
function PlaybookTemplateWindow({ instanceYaml }) {
    const [copyMessage, setCopyMessage] = useState(null);

    // Generate template YAML from instance YAML
    const templateYaml = instanceYaml ? generateTemplateYaml(instanceYaml) : '';

    const handleCopyTemplate = async () => {
        if (!templateYaml) {
            alert('No template to copy. Please configure the playbook first.');
            return;
        }

        try {
            // Copy template YAML to clipboard
            await navigator.clipboard.writeText(templateYaml);
            setCopyMessage('Template copied to clipboard ✅');
            setTimeout(() => setCopyMessage(null), 3000);
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            try {
                const textArea = document.createElement('textarea');
                textArea.value = templateYaml;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopyMessage('Template copied to clipboard ✅');
                setTimeout(() => setCopyMessage(null), 3000);
            } catch (fallbackError) {
                alert('Failed to copy template: ' + error.message);
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Playbook Template</h3>
                    <p className="text-sm text-gray-500 mt-1">Template automatically generated from instance YAML</p>
                </div>
                <button
                    onClick={handleCopyTemplate}
                    disabled={!templateYaml}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Copy Template
                </button>
            </div>

            {copyMessage && (
                <div className="mb-3 p-2 bg-green-50 text-green-800 border border-green-200 rounded text-sm">
                    {copyMessage}
                </div>
            )}

            <div className="bg-gray-50 rounded p-3 border border-gray-200 max-h-64 overflow-y-auto">
                {templateYaml ? (
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                        {templateYaml}
                    </pre>
                ) : (
                    <p className="text-sm text-gray-500 italic">(Awaiting instance data…)</p>
                )}
            </div>
        </div>
    );
}


function PlaybookBuilder() {
    // Initialize state with default values
    // Trigger / Playbook Info state
    const [triggerSource, setTriggerSource] = useState('manual');
    const [playbookName, setPlaybookName] = useState('Phishing Email');
    
    const [alertJson, setAlertJson] = useState(null);
    
    const [collect, setCollect] = useState({
        sender: '',
        recipient: '',
        subject: '',
        urls: '',
        attachment_hashes: '',
        src_ip: ''
    });
    
    const [enrich, setEnrich] = useState({
        vt_hash: true,
        vt_url: true,
        abuseipdb_geoip: false
    });
    
    const [condition, setCondition] = useState({
        expression: '${steps.vt_hash.any_malicious == true || steps.vt_url.max_score >= 70 || steps.abuseipdb.score >= 85}'
    });
    
    const [actions, setActions] = useState({
        trueActions: [], // Array of {id, action, input}
        falseActions: [] // Array of {id, action, input}
    });
    
    // Mock results state: { steps: {...}, source: 'generated' | 'reused', timestamp: Date }
    const [mockResults, setMockResults] = useState(null);
    const [mockResultsStatus, setMockResultsStatus] = useState(null); // { type: 'reused' | 'generated', message: string }
    
    // Combine all state into config object
    const config = {
        name: playbookName, // Use playbookName instead of name
        collect,
        enrich,
        condition,
        actions
    };
    
    // Handler for when mock results are generated/reused
    const handleMockResultsGenerated = (steps, source) => {
        setMockResults({ steps, source, timestamp: new Date() });
        setMockResultsStatus({
            type: source,
            message: source === 'reused' 
                ? 'Using previously generated mock results' 
                : 'New mock results generated'
        });
        // Clear status after 5 seconds
        setTimeout(() => setMockResultsStatus(null), 5000);
    };
    
    // Handler for reset
    const handleReset = () => {
        setPlaybookName('Phishing Email');
        setAlertJson(null);
        setCollect({
            sender: '',
            recipient: '',
            subject: '',
            urls: '',
            attachment_hashes: '',
            src_ip: ''
        });
        setEnrich({
            vt_hash: true,
            vt_url: true,
            abuseipdb_geoip: false
        });
        setCondition({
            expression: '${steps.vt_hash.any_malicious == true || steps.vt_url.max_score >= 70 || steps.abuseipdb.score >= 85}'
        });
        setActions({
            trueActions: [],
            falseActions: []
        });
        // Clear mock results
        setMockResults(null);
        setMockResultsStatus(null);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* Mock Results Status Banner */}
            {mockResultsStatus && (
                <div className={`mb-4 p-3 rounded-lg border-2 ${
                    mockResultsStatus.type === 'reused' 
                        ? 'bg-blue-50 border-blue-500' 
                        : 'bg-green-50 border-green-500'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {mockResultsStatus.type === 'reused' ? (
                                <span className="text-blue-700 font-semibold">🔄 {mockResultsStatus.message}</span>
                            ) : (
                                <span className="text-green-700 font-semibold">✨ {mockResultsStatus.message}</span>
                            )}
                        </div>
                        <button
                            onClick={() => setMockResultsStatus(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Header Title */}
            <div className="mb-6 rounded-lg overflow-hidden shadow-lg relative" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '30px',
                textAlign: 'center'
            }}>
                {/* Back Button */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="absolute bottom-4 left-4 w-9 h-9 flex items-center justify-center rounded-lg transition-all hover:bg-white hover:bg-opacity-20"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    ←
                </button>
                <h1 style={{
                    fontSize: '2.5em',
                    marginBottom: '10px',
                    fontWeight: 'bold'
                }}>
                    Visual Playbook Builder
                </h1>
            </div>

            {/* Three Column Layout */}
            <div className="grid grid-cols-3 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <AlertInputPanel 
                        setCollect={setCollect}
                        setAlertJson={setAlertJson}
                        setPlaybookName={setPlaybookName}
                    />
                    <TriggerPlaybookInfoPanel
                        triggerSource={triggerSource}
                        setTriggerSource={setTriggerSource}
                        playbookName={playbookName}
                        setPlaybookName={setPlaybookName}
                    />
                    <CollectPanel 
                        collect={collect} 
                        setCollect={setCollect}
                        alertJson={alertJson}
                    />
                </div>

                {/* Middle Column */}
                <div className="space-y-4">
                    <EnrichPanel enrich={enrich} setEnrich={setEnrich} />
                    <ConditionPanel 
                        condition={condition} 
                        setCondition={setCondition} 
                        config={config}
                        onMockResultsGenerated={handleMockResultsGenerated}
                        mockResults={mockResults}
                    />
                    <ActionsPanel 
                        actions={actions} 
                        setActions={setActions}
                        collect={collect}
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <PlaybookTemplateWindowWithYaml config={config} />
                    <YamlPreviewPanel 
                        config={config}
                        mockResults={mockResults}
                        onMockResultsGenerated={handleMockResultsGenerated}
                    />
                </div>
            </div>
        </div>
    );
}

export default PlaybookBuilder;

