/**
 * Simple rule evaluator for normalized alerts
 * Supports new format with conditions.all/operator/value
 * @param {Object} normalized - Normalized alert object
 * @param {Array} rules - Array of rule objects
 * @returns {Object} Object with logs array and matches array
 */
function evaluateRules(normalized, rules) {
    const logs = [];
    const matches = [];
    
    // Iterate through all rules
    for (const rule of rules) {
        const conditions = rule.conditions || {};
        let matched = false;
        
        // Support conditions.all (all conditions must match)
        if (conditions.all && Array.isArray(conditions.all)) {
            matched = true;
            for (const condition of conditions.all) {
                if (!evaluateCondition(condition, normalized)) {
                    matched = false;
                    break;
                }
            }
        }
        // Support conditions.any (at least one condition must match)
        else if (conditions.any && Array.isArray(conditions.any)) {
            matched = false;
            for (const condition of conditions.any) {
                if (evaluateCondition(condition, normalized)) {
                    matched = true;
                    break;
                }
            }
        }
        
        // If rule matched, add to matches and log actions
        if (matched) {
            matches.push(rule);
            logs.push(`📘 Matched rule: ${rule.name}`);
            
            // Log actions from the 'actions' array
            if (rule.actions && Array.isArray(rule.actions)) {
                for (const actionStep of rule.actions) {
                    let actionName, params;
                    
                    if (typeof actionStep === 'string') {
                        // Simple format: action: "firewall.block_ip"
                        actionName = actionStep;
                        params = {};
                    } else if (actionStep.action) {
                        // Object format: { action: "firewall.block_ip", params: {...} }
                        actionName = actionStep.action;
                        params = actionStep.params || {};
                    } else {
                        // Legacy format - extract action name from object keys
                        actionName = Object.keys(actionStep)[0];
                        params = actionStep[actionName]?.params || {};
                    }
                    
                    // Extract relevant parameter value for logging
                    let paramValue = null;
                    if (actionName === 'firewall.block_ip' && params.ip) {
                        paramValue = normalized[params.ip] || normalized.src_ip;
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
 * Evaluate a single condition against normalized alert
 * @param {Object} condition - Condition object with field, operator, value
 * @param {Object} normalized - Normalized alert object
 * @returns {boolean} True if condition matches
 */
function evaluateCondition(condition, normalized) {
    const field = condition.field || '';
    const operator = condition.operator || '';
    const value = condition.value;
    
    // Extract field value from normalized alert (support nested paths like alert.type)
    let alertValue;
    if (field.startsWith('alert.')) {
        const fieldPath = field.replace('alert.', '').split('.');
        alertValue = normalized;
        for (const part of fieldPath) {
            if (alertValue && typeof alertValue === 'object' && part in alertValue) {
                alertValue = alertValue[part];
            } else {
                alertValue = undefined;
                break;
            }
        }
    } else {
        alertValue = normalized[field];
    }
    
    // Apply operator
    switch (operator) {
        case 'equals':
            return alertValue === value;
        case 'greater_than':
            try {
                return parseFloat(alertValue) > parseFloat(value);
            } catch (e) {
                return false;
            }
        case 'less_than':
            try {
                return parseFloat(alertValue) < parseFloat(value);
            } catch (e) {
                return false;
            }
        case 'greater_than_or_equal':
            try {
                return parseFloat(alertValue) >= parseFloat(value);
            } catch (e) {
                return false;
            }
        case 'less_than_or_equal':
            try {
                return parseFloat(alertValue) <= parseFloat(value);
            } catch (e) {
                return false;
            }
        case 'contains':
            if (typeof alertValue === 'string' && typeof value === 'string') {
                return alertValue.includes(value);
            }
            return false;
        case 'not_equals':
            return alertValue !== value;
        default:
            // Unknown operator, default to False
            return false;
    }
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
