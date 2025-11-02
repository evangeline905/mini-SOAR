from typing import Optional

def block_ip(ip: str, reason: Optional[str] = None) -> None:
    print(f"[FIREWALL] Blocked IP {ip} {f'({reason})' if reason else ''}")
