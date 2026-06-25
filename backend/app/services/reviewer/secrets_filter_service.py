from detect_secrets import SecretsCollection
from detect_secrets.settings import default_settings
import tempfile
import os
import re


COMMON_PATTERNS = [
    r'AIza[0-9A-Za-z\-_]{35}',
    r'AKIA[0-9A-Z]{16}',
    r'gh[pousr]_[A-Za-z0-9]+',
    r'eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+',
    r'-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----',
    r'Bearer\s+[A-Za-z0-9\-._~+/]+=*'
]


def scan_diff(diff_text):
    with tempfile.NamedTemporaryFile(mode="w",suffix=".txt",delete=False,encoding="utf-8") as f:
        f.write(diff_text)
        temp_path = f.name

    try:
        with default_settings():
            secrets = SecretsCollection()
            secrets.scan_file(temp_path)

            findings = []

            for filename in secrets.files:
                for secret in secrets.files[filename]:
                    findings.append({
                        "line_number": secret.line_number,
                        "type": secret.type_name
                    })

            return findings

    finally:
        os.remove(temp_path)


def redact_text(text):
    for pattern in COMMON_PATTERNS:
        text = re.sub(pattern,"XXXXXX",text,flags=re.MULTILINE)

    return text


def sanitize_files(files):
    sanitized = []

    for file in files:
        findings = scan_diff(file["diff"])
        sanitized.append({
            "path": file["path"],
            "change_type": file["change_type"],
            "secret_findings": findings,
            "diff": redact_text(file["diff"])
        })

    return sanitized