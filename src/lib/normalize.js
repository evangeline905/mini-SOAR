/**
 * Normalize Splunk-style alert JSON to a standard format
 * @param {Object} alertJson - Splunk alert JSON (may have data in 'result' field)
 * @returns {Object} Normalized alert object with standard fields
 */
function normalizeSplunkAlert(alertJson) {
    // Extract data from 'result' field if present, otherwise use the alert itself
    const data = alertJson.result || alertJson;
    
    // Normalize the alert with safe defaults
    const normalized = {
        type: data.type || data.alert_type || data._raw?.type || null,
        severity: data.severity || data.priority || data.level || "Medium",
        machine: data.machine || data.hostname || data.host || data.computer || null,
        src_ip: data.src_ip || data.source_ip || data.src || data.source || data.ip || null,
        user: data.user || data.username || data.account || null,
        event_count: parseInt(data.event_count || data.count || data.events || 1, 10),
        timestamp: data.timestamp || data._time || data.time || data.event_time || null,
        raw: alertJson // Keep original for reference
    };
    
    // Ensure event_count is a valid number (default to 1 if invalid)
    if (isNaN(normalized.event_count) || normalized.event_count < 0) {
        normalized.event_count = 1;
    }
    
    // Ensure severity defaults to "Medium" if empty string or null
    if (!normalized.severity || normalized.severity.trim() === "") {
        normalized.severity = "Medium";
    }
    
    return normalized;
}

// Export for ES modules (React/Modern JS)
export { normalizeSplunkAlert };

// Export for Node.js or browser use (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeSplunkAlert };
}

