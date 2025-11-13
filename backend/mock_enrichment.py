import random

def vt_hash_result(hashes):
    """
    Mock VirusTotal hash lookup result
    
    Args:
        hashes: List of hash strings or None
        
    Returns:
        dict: Mock result with any_malicious, max_score, and total_lookups
    """
    return {
        "any_malicious": random.random() < 0.3,
        "max_score": int(random.random() * 100),
        "total_lookups": len(hashes or [])
    }

def vt_url_result(urls):
    """
    Mock VirusTotal URL reputation result
    
    Args:
        urls: List of URL strings or None
        
    Returns:
        dict: Mock result with any_malicious, max_score, and urls_checked
    """
    return {
        "any_malicious": random.random() < 0.5,
        "max_score": int(random.random() * 100),
        "urls_checked": len(urls or [])
    }

def abuseipdb_result(ip):
    """
    Mock AbuseIPDB GeoIP lookup result
    
    Args:
        ip: IP address string
        
    Returns:
        dict: Mock result with score, country, asn, and ip
    """
    return {
        "score": int(random.random() * 100),
        "country": "US",
        "asn": "AS15169",
        "ip": ip
    }





