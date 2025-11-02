import { useState, useEffect } from 'react';

/**
 * SplunkInputPanel - Component for inputting and normalizing Splunk JSON alerts
 * @param {Function} onSubmitJson - Callback function to handle normalized JSON payload
 * @param {string} initialValue - Initial JSON value (optional)
 */
function SplunkInputPanel({ onSubmitJson, initialValue }) {
    const defaultJson = `{
  "result": {
    "type": "Brute Force",
    "severity": "High",
    "src_ip": "203.0.113.45",
    "hostname": "PC-01",
    "username": "admin",
    "event_count": 15,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`;
    
    const [jsonInput, setJsonInput] = useState(initialValue || defaultJson);
    const [error, setError] = useState(null);

    // Update input when initialValue changes (only if it's not null/undefined)
    useEffect(() => {
        if (initialValue !== null && initialValue !== undefined) {
            setJsonInput(initialValue);
            setError(null);
        }
    }, [initialValue]);

    const handleNormalize = () => {
        try {
            // Parse JSON
            const parsedJson = JSON.parse(jsonInput);
            
            // Clear any previous errors
            setError(null);
            
            // Call the onSubmitJson callback with parsed JSON
            if (onSubmitJson) {
                onSubmitJson(parsedJson);
            }
        } catch (e) {
            // Show error message if JSON is invalid
            setError(`Invalid JSON: ${e.message}`);
        }
    };

    return (
        <div style={{
            padding: '20px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9',
            marginBottom: '20px'
        }}>
            <label style={{
                display: 'block',
                fontSize: '1.1em',
                fontWeight: 600,
                marginBottom: '10px',
                color: '#333'
            }}>
                Splunk JSON Input:
            </label>
            
            <textarea
                value={jsonInput}
                onChange={(e) => {
                    setJsonInput(e.target.value);
                    setError(null); // Clear error when user types
                }}
                style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '15px',
                    border: `2px solid ${error ? '#dc3545' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff'
                }}
                placeholder="Enter Splunk JSON here..."
            />
            
            {error && (
                <div style={{
                    marginTop: '10px',
                    padding: '12px',
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    border: '1px solid #f5c6cb',
                    borderRadius: '6px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}
            
            <button
                onClick={handleNormalize}
                style={{
                    marginTop: '15px',
                    padding: '12px 30px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    fontSize: '1em',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#5568d3';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#667eea';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                Normalize
            </button>
        </div>
    );
}

export default SplunkInputPanel;

