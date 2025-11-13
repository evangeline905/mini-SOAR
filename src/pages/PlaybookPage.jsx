import { useState, useEffect } from 'react';
import SplunkInputPanel from '../components/SplunkInputPanel';
import LogConsole from '../components/LogConsole';
import { normalizeSplunkAlert } from '../lib/normalize';
import { evaluateRules, loadRulesFromJson } from '../lib/rulesEngine';

function PlaybookPage() {
    const [normalized, setNormalized] = useState(null);
    const [logs, setLogs] = useState([]);
    const [rules, setRules] = useState([]);
    const [sampleJson, setSampleJson] = useState(null);
    const [samplesExpanded, setSamplesExpanded] = useState(false);

    // Sample alerts
    const sampleAlerts = {
        bruteForce: JSON.stringify({
            result: {
                type: "Brute Force",
                severity: "High",
                src_ip: "203.0.113.45",
                hostname: "PC-01",
                username: "admin",
                event_count: 15,
                timestamp: "2024-01-15T10:30:00Z"
            }
        }, null, 2),
        malware: JSON.stringify({
            result: {
                type: "Malware",
                severity: "High",
                hostname: "PC-02",
                src_ip: "192.168.1.100",
                username: "system",
                event_count: 1,
                timestamp: "2024-01-15T14:22:00Z",
                file_path: "/tmp/suspicious.exe"
            }
        }, null, 2),
        suspicious: JSON.stringify({
            result: {
                type: "Suspicious Activity",
                severity: "Medium",
                src_ip: "10.0.0.50",
                hostname: "SERVER-03",
                username: "webadmin",
                event_count: 5,
                timestamp: "2024-01-15T09:15:00Z",
                description: "Multiple failed authentication attempts"
            }
        }, null, 2)
    };

    // Load rules on component mount
    useEffect(() => {
        loadRulesFromJson('/config/rules.json').then(loadedRules => {
            setRules(loadedRules);
        }).catch(error => {
            console.error('Failed to load rules:', error);
            setLogs(['❌ Error loading rules: ' + error.message]);
        });
    }, []);

    const handleSubmitJson = (alertJson) => {
        // Normalize the JSON
        const normalizedAlert = normalizeSplunkAlert(alertJson);
        setNormalized(normalizedAlert);

        // Evaluate rules
        const evaluationResult = evaluateRules(normalizedAlert, rules);

        // Combine and show logs
        // Start with normalization log
        const allLogs = [`✅ Alert normalized successfully`];
        
        // Add evaluation logs
        allLogs.push(...evaluationResult.logs);

        setLogs(allLogs);
    };

    // Format normalized fields for display
    const getNormalizedFields = () => {
        if (!normalized) return null;

        // Filter out 'raw' field for display
        const { raw, ...displayFields } = normalized;
        
        return Object.entries(displayFields).map(([key, value]) => ({
            key,
            value: value === null || value === undefined ? '(empty)' : String(value)
        }));
    };

    return (
        <div>
            {/* Back Button */}
            <div style={{
                marginBottom: '20px'
            }}>
                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        transition: 'all 0.3s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#5a6268';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#6c757d';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    ←
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                padding: '20px',
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* Left Column */}
                <div>
                    <h2 style={{
                        marginBottom: '20px',
                        fontSize: '1.5em',
                        fontWeight: 600,
                        color: '#333'
                    }}>
                        Splunk Alert Input
                    </h2>
                
                {/* Sample Alerts Section */}
                <div style={{
                    marginBottom: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9',
                    overflow: 'hidden'
                }}>
                    <button
                        onClick={() => setSamplesExpanded(!samplesExpanded)}
                        style={{
                            width: '100%',
                            padding: '15px 20px',
                            border: 'none',
                            backgroundColor: '#f0f0f0',
                            cursor: 'pointer',
                            fontSize: '1em',
                            fontWeight: 600,
                            color: '#333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#e8e8e8';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = '#f0f0f0';
                        }}
                    >
                        <span>Sample Alerts</span>
                        <span style={{
                            fontSize: '0.9em',
                            transition: 'transform 0.3s',
                            transform: samplesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}>
                            ▼
                        </span>
                    </button>
                    
                    {samplesExpanded && (
                        <div style={{
                            padding: '15px 20px',
                            borderTop: '1px solid #e0e0e0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setSampleJson(sampleAlerts.bruteForce)}
                                style={{
                                    padding: '10px 15px',
                                    border: '1px solid #667eea',
                                    borderRadius: '6px',
                                    backgroundColor: '#fff',
                                    color: '#667eea',
                                    fontSize: '0.95em',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.3s'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = '#667eea';
                                    e.target.style.color = '#fff';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = '#fff';
                                    e.target.style.color = '#667eea';
                                }}
                            >
                                Brute Force Attack (15 events)
                            </button>
                            
                            <button
                                onClick={() => setSampleJson(sampleAlerts.malware)}
                                style={{
                                    padding: '10px 15px',
                                    border: '1px solid #dc3545',
                                    borderRadius: '6px',
                                    backgroundColor: '#fff',
                                    color: '#dc3545',
                                    fontSize: '0.95em',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.3s'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = '#dc3545';
                                    e.target.style.color = '#fff';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = '#fff';
                                    e.target.style.color = '#dc3545';
                                }}
                            >
                                Malware Detection (High Severity)
                            </button>
                            
                            <button
                                onClick={() => setSampleJson(sampleAlerts.suspicious)}
                                style={{
                                    padding: '10px 15px',
                                    border: '1px solid #ffc107',
                                    borderRadius: '6px',
                                    backgroundColor: '#fff',
                                    color: '#856404',
                                    fontSize: '0.95em',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.3s'
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = '#ffc107';
                                    e.target.style.color = '#856404';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = '#fff';
                                    e.target.style.color = '#856404';
                                }}
                            >
                                Suspicious Activity (5 events)
                            </button>
                        </div>
                    )}
                </div>
                
                <SplunkInputPanel onSubmitJson={handleSubmitJson} initialValue={sampleJson} />
            </div>

            {/* Right Column */}
            <div>
                <h2 style={{
                    marginBottom: '20px',
                    fontSize: '1.5em',
                    fontWeight: 600,
                    color: '#333'
                }}>
                    Normalized Alert & Execution Logs
                </h2>

                {/* Normalized Fields */}
                {normalized && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '20px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                    }}>
                        <h3 style={{
                            marginBottom: '15px',
                            fontSize: '1.2em',
                            fontWeight: 600,
                            color: '#333'
                        }}>
                            Normalized Fields:
                        </h3>
                        <div style={{
                            display: 'grid',
                            gap: '10px'
                        }}>
                            {getNormalizedFields().map(({ key, value }) => (
                                <div
                                    key={key}
                                    style={{
                                        display: 'flex',
                                        gap: '10px',
                                        padding: '8px',
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        border: '1px solid #e0e0e0'
                                    }}
                                >
                                    <strong style={{
                                        minWidth: '140px',
                                        color: '#667eea',
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: '13px'
                                    }}>
                                        {key}:
                                    </strong>
                                    <span style={{
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: '13px',
                                        color: '#333',
                                        wordBreak: 'break-word'
                                    }}>
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Log Console */}
                <div>
                    <h3 style={{
                        marginBottom: '15px',
                        fontSize: '1.2em',
                        fontWeight: 600,
                        color: '#333'
                    }}>
                        Execution Logs:
                    </h3>
                    <LogConsole lines={logs} />
                </div>
            </div>
            </div>
        </div>
    );
}

export default PlaybookPage;

