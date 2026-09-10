#!/usr/bin/env python3
"""Run ONE shell command on a remote server via paramiko (or connect-test only).

Protocol: one JSON object on stdin, one JSON line on stdout.
stdin:  {"conn": {"host", "port", "username", "password", "key_path"},
         "command": str|null, "timeout": seconds}
        command null = connectivity test (connect + close).
stdout: {"ok": true, "exit_code": int, "stdout": str, "stderr": str}
      | {"ok": true, "tested": true}
      | {"ok": false, "error": str}

Unknown host keys are auto-accepted (first-connect trust, like
`ssh -o StrictHostKeyChecking=accept-new`). Secrets never appear in argv.
"""
import json
import sys


def fail(msg):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(0)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception as e:  # noqa: BLE001 - any stdin error is user-facing
        fail(f"payload invalido: {e}")
    conn = data.get("conn") or {}
    host = str(conn.get("host") or "").strip()
    username = str(conn.get("username") or "").strip()
    if not host or not username:
        fail("host/username ausentes no payload")
    command = data.get("command")
    try:
        timeout = float(data.get("timeout") or 60)
    except (TypeError, ValueError):
        timeout = 60.0

    try:
        import paramiko
    except Exception as e:  # noqa: BLE001 - import failure is the install state
        fail(f"paramiko nao importavel: {e}")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    key_path = str(conn.get("key_path") or "").strip()
    password = str(conn.get("password") or "")
    kwargs = {
        "hostname": host,
        "port": int(conn.get("port") or 22),
        "username": username,
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

    try:
        client.connect(**kwargs)
    except Exception as e:  # noqa: BLE001 - network/auth errors are user-facing
        fail(f"conexao falhou: {type(e).__name__}: {e}")

    try:
        if command is None:
            print(json.dumps({"ok": True, "tested": True}))
            return
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        out = stdout.read()
        err = stderr.read()
        code = stdout.channel.recv_exit_status()
        print(json.dumps({
            "ok": True,
            "exit_code": int(code),
            "stdout": out.decode("utf-8", "replace"),
            "stderr": err.decode("utf-8", "replace"),
        }))
    except Exception as e:  # noqa: BLE001 - timeouts/protocol errors are user-facing
        fail(f"execucao falhou: {type(e).__name__}: {e}")
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
