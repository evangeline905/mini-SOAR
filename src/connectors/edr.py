from typing import Optional

def isolate_host(hostname: str, note: Optional[str] = None) -> None:
    print(f"[EDR] Isolated host {hostname} {f'({note})' if note else ''}")
