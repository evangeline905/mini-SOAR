from typing import Dict, Any
from .connectors import firewall, edr

def execute(action_name: str, alert: Dict[str, Any], params: Dict[str, Any]) -> None:
    if action_name == "firewall_block_ip":
        ip_field = params.get("ip_field", "src_ip")
        ip = alert.get(ip_field)
        if ip:
            firewall.block_ip(ip, reason=f"Rule-based action for alert {alert.get('id')}")
        else:
            print(f"⚠️ [Action] Missing field '{ip_field}' in alert {alert.get('id')}")
    elif action_name == "edr_isolate_host":
        host_field = params.get("host_field", "machine")
        host = alert.get(host_field)
        if host:
            edr.isolate_host(host, note=f"Rule-based action for alert {alert.get('id')}")
        else:
            print(f"⚠️ [Action] Missing field '{host_field}' in alert {alert.get('id')}")
    else:
        print(f"⚠️ [Action] Unknown action '{action_name}'")
