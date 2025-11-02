/**
 * Simple rule evaluator for normalized alerts
 * @param {Object} normalized - Normalized alert object
 * @param {Array} rules - Array of rule objects
 * @returns {Object} Object with logs array and matches array
 */
function evaluateRules(normalized, rules) {
    const logs = [];
    const matches = [];
    
    // Iterate through all rules
    for (const rule of rules) {
        const conditions = rule.if || {};
        let matched = true;
        
        // Check type match
        if (conditions.type !== undefined) {
            if (normalized.type !== conditions.type) {
                matched = false;
            }
        }
        
        // Check severity match (support both severity and severity_equals)
        if (matched && (conditions.severity_equals !== undefined || conditions.severity !== undefined)) {
            const severityCondition = conditions.severity_equals !== undefined 
                ? conditions.severity_equals 
                : conditions.severity;
            if (normalized.severity !== severityCondition) {
                matched = false;
            }
        }
        
        // Check event_count greater than condition (support both event_count_greater_than and count_greater_than)
        if (matched && (conditions.event_count_greater_than !== undefined || conditions.count_greater_than !== undefined)) {
            const alertCount = normalized.event_count || 0;
            const threshold = conditions.event_count_greater_than !== undefined
                ? conditions.event_count_greater_than
                : conditions.count_greater_than;
            if (alertCount <= threshold) {
                matched = false;
            }
        }
        
        // If rule matched, add to matches and log actions
        if (matched) {
            matches.push(rule);
            logs.push(`📘 Matched rule: ${rule.name}`);
            
            // Log actions from the 'then' array
            // Support both formats:
            // Old: { "action": "firewall_block_ip", "params": {...} }
            // New: { "firewall_block_ip": { "params": {...} } }
            if (rule.then && Array.isArray(rule.then)) {
                for (const actionStep of rule.then) {
                    let actionName, params;
                    
                    // Check new format (action name as key)
                    if (actionStep.action) {
                        // Old format
                        actionName = actionStep.action;
                        params = actionStep.params || {};
                    } else {
                        // New format - extract action name from object keys
                        actionName = Object.keys(actionStep)[0];
                        params = actionStep[actionName]?.params || {};
                    }
                    
                    // Extract relevant parameter value for logging
                    let paramValue = null;
                    if (actionName === 'firewall_block_ip' && params.ip_field) {
                        paramValue = normalized[params.ip_field] || normalized.src_ip;
                    } else if ((actionName === 'edr_isolate_host' || actionName === 'isolate_host') && params.host_field) {
                        paramValue = normalized[params.host_field] || normalized.machine;
                    }
                    
                    // Format action log message
                    if (paramValue) {
                        logs.push(`🔥 Action executed: ${actionName} (${paramValue})`);
                    } else {
                        logs.push(`🔥 Action executed: ${actionName}`);
                    }
                }
            }
        }
    }
    
    // If no rules matched, add info log
    if (matches.length === 0) {
        logs.push('ℹ️ No rule matched.');
    }
    
    return { logs, matches };
}

/**
 * Load rules from JSON file (for browser use, you may need to fetch this)
 * @param {string} rulesPath - Path to rules.json file
 * @returns {Promise<Array>} Promise that resolves to rules array
 */
async function loadRulesFromJson(rulesPath) {
    try {
        const response = await fetch(rulesPath);
        if (!response.ok) {
            throw new Error(`Failed to load rules: ${response.statusText}`);
        }
        const data = await response.json();
        // Support both formats: array directly or { "rules": [...] }
        if (Array.isArray(data)) {
            return data;
        } else if (data.rules && Array.isArray(data.rules)) {
            return data.rules;
        }
        return [];
    } catch (error) {
        console.error('Error loading rules:', error);
        return [];
    }
}

// Export for ES modules (React/Modern JS)
export { evaluateRules, loadRulesFromJson };

// Export for Node.js or browser use (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateRules, loadRulesFromJson };
}

