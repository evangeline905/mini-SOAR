import { PlaybookConfig } from '../types/playbook';

export function generateYaml(config: PlaybookConfig): string {
    const steps: any[] = [];
    const stepIds: string[] = [];

    // Step 1: collect_normalize
    const collectStep = {
        id: 'collect_normalize',
        type: 'collect_normalize',
        params: {
            mapping: {
                sender: config.collect.sender,
                recipient: config.collect.recipient,
                subject: config.collect.subject,
                urls: config.collect.urls,
                attachment_hashes: config.collect.attachment_hashes,
                src_ip: config.collect.src_ip
            }
        },
        next: null as string | null
    };
    steps.push(collectStep);
    stepIds.push('collect_normalize');

    // Generate enrich steps for enabled flags
    const enrichSteps: string[] = [];
    if (config.enrich.vt_hash) {
        const vtHashStep = {
            id: 'vt_hash',
            type: 'enrich',
            params: {
                provider: 'virustotal',
                type: 'hash'
            },
            next: null as string | null
        };
        steps.push(vtHashStep);
        stepIds.push('vt_hash');
        enrichSteps.push('vt_hash');
    }
    
    if (config.enrich.vt_url) {
        const vtUrlStep = {
            id: 'vt_url',
            type: 'enrich',
            params: {
                provider: 'virustotal',
                type: 'url'
            },
            next: null as string | null
        };
        steps.push(vtUrlStep);
        stepIds.push('vt_url');
        enrichSteps.push('vt_url');
    }
    
    if (config.enrich.abuseipdb_geoip) {
        const abuseipdbStep = {
            id: 'abuseipdb',
            type: 'enrich',
            params: {
                provider: 'abuseipdb',
                type: 'geoip'
            },
            next: null as string | null
        };
        steps.push(abuseipdbStep);
        stepIds.push('abuseipdb');
        enrichSteps.push('abuseipdb');
    }

    // Set next for collect_normalize
    if (enrichSteps.length > 0) {
        collectStep.next = enrichSteps[0];
    } else {
        collectStep.next = 'evaluate';
    }

    // Set next for enrich steps (all point to evaluate)
    enrichSteps.forEach((stepId, index) => {
        const step = steps.find(s => s.id === stepId);
        if (step) {
            if (index < enrichSteps.length - 1) {
                step.next = enrichSteps[index + 1];
            } else {
                step.next = 'evaluate';
            }
        }
    });

    // Step: evaluate (condition)
    const evaluateStep = {
        id: 'evaluate',
        type: 'evaluate',
        params: {
            expression: config.condition.expression
        },
        true_next: 'high',
        false_next: 'low'
    };
    steps.push(evaluateStep);
    stepIds.push('evaluate');

    // Step: action_group high (trueActions)
    if (config.actions.trueActions.length > 0) {
        const highActionGroup = {
            id: 'high',
            type: 'action_group',
            params: {
                actions: config.actions.trueActions.map(action => ({
                    action: action.action,
                    params: action.input
                }))
            },
            next: null
        };
        steps.push(highActionGroup);
        stepIds.push('high');
    }

    // Step: action_group low (falseActions)
    if (config.actions.falseActions.length > 0) {
        const lowActionGroup = {
            id: 'low',
            type: 'action_group',
            params: {
                actions: config.actions.falseActions.map(action => ({
                    action: action.action,
                    params: action.input
                }))
            },
            next: null
        };
        steps.push(lowActionGroup);
        stepIds.push('low');
    }

    // Build YAML structure
    const yamlStructure = {
        name: config.name,
        steps: steps
    };

    // Convert to YAML string (simple implementation)
    return convertToYaml(yamlStructure);
}

function convertToYaml(obj: any, indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
                yaml += `${indentStr}- `;
                const itemYaml = convertToYaml(item, indent + 1);
                const lines = itemYaml.split('\n');
                yaml += lines[0] + '\n';
                lines.slice(1).forEach(line => {
                    if (line.trim()) {
                        yaml += indentStr + '  ' + line + '\n';
                    }
                });
            } else {
                yaml += `${indentStr}- ${item}\n`;
            }
        });
    } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key, index) => {
            const value = obj[key];
            if (value === null || value === undefined) {
                yaml += `${indentStr}${key}: null\n`;
            } else if (Array.isArray(value)) {
                yaml += `${indentStr}${key}:\n`;
                yaml += convertToYaml(value, indent + 1);
            } else if (typeof value === 'object') {
                yaml += `${indentStr}${key}:\n`;
                yaml += convertToYaml(value, indent + 1);
            } else if (typeof value === 'string' && (value.includes('\n') || value.includes('${'))) {
                yaml += `${indentStr}${key}: |\n`;
                const lines = value.split('\n');
                lines.forEach(line => {
                    yaml += `${indentStr}  ${line}\n`;
                });
            } else {
                yaml += `${indentStr}${key}: ${value}\n`;
            }
        });
    } else {
        yaml += `${obj}\n`;
    }

    return yaml;
}




