#!/usr/bin/env python3
"""Upload or download ONE file over SFTP via paramiko.

Protocol: one JSON object on stdin, one JSON line on stdout.
stdin:  {"conn": {"host", "port", "username", "password", "key_path"},
         "direction": "upload"|"download", "local_path": str, "remote_path": str}
stdout: {"ok": true, "bytes": int} | {"ok": false, "error": str}
"""
import json
import os
import sys


def fail(msg):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(0)


def connect(conn):
    import paramiko

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    key_path = str(conn.get("key_path") or "").strip()
    password = str(conn.get("password") or "")
    kwargs = {
        "hostname": str(conn.get("host") or "").strip(),
        "port": int(conn.get("port") or 22),
        "username": str(conn.get("username") or "").strip(),
        "timeout": 15.0,
        "banner_timeout": 15.0,
        "auth_timeout": 15.0,
        "allow_agent": False,
        "look_for_keys": False,
    }
    if key_path:
        kwargs["key_filename"] = key_path
        kwargs["passphrase"] = password or None
    else:
        kwargs["password"] = password
    client.connect(**kwargs)
    return client


def main():
    try:
        data = json.load(sys.stdin)
    except Exception as e:  # noqa: BLE001 - any stdin error is user-facing
        fail(f"payload invalido: {e}")
    conn = data.get("conn") or {}
    direction = data.get("direction")
    local_path = str(data.get("local_path") or "")
    remote_path = str(data.get("remote_path") or "")
    if direction not in ("upload", "download"):
        fail("direction deve ser 'upload' ou 'download'")
    if not remote_path:
        fail("remote_path obrigatorio")
    if direction == "upload" and not os.path.isfile(local_path):
        fail(f"arquivo local inexistente: {local_path}")

    try:
        client = connect(conn)
    except Exception as e:  # noqa: BLE001 - network/auth errors are user-facing
        fail(f"conexao falhou: {type(e).__name__}: {e}")

    try:
        sftp = client.open_sftp()
        try:
            if direction == "upload":
                sftp.put(local_path, remote_path)
                size = os.path.getsize(local_path)
            else:
                sftp.get(remote_path, local_path)
                size = sftp.stat(remote_path).st_size
        finally:
            try:
                sftp.close()
            except Exception:  # noqa: BLE001 - close is best-effort
                pass
        print(json.dumps({"ok": True, "bytes": int(size)}))
    except Exception as e:  # noqa: BLE001 - sftp errors are user-facing
        fail(f"transferencia falhou: {type(e).__name__}: {e}")
    finally:
        try:
            client.close()
        except Exception:  # noqa: BLE001 - close is best-effort
            pass


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        # The Node parent stopped reading (timeout/abort); nothing to report to.
        pass
