from src.rules import evaluate

def test_brute_force_rule():
    rules = [{
        "name": "brute_force_block",
        "if": {"type": "Brute Force", "count_greater_than": 5},
        "then": [{"action": "firewall_block_ip", "params": {"ip_field": "src_ip"}}]
    }]
    a1 = {"id": 1, "type": "Brute Force", "count": 8, "src_ip": "1.2.3.4"}
    a2 = {"id": 2, "type": "Brute Force", "count": 3, "src_ip": "1.2.3.4"}
    assert evaluate(rules, a1) != []
    assert evaluate(rules, a2) == []
