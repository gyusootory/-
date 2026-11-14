#!/usr/bin/env python3
"""Firebase Hosting에 정적 폴더를 배포합니다 (firebase-tools/Node 없이 Hosting REST API로).

`firebase deploy --only hosting` 이 하는 일을 그대로 따라 합니다.
  1. 버전(version) 생성            POST  /v1beta1/sites/{site}/versions
  2. 파일 해시 등록                POST  /v1beta1/{version}:populateFiles
  3. 없는 파일만 업로드            POST  {uploadUrl}/{hash}   (gzip 본문)
  4. 버전 확정 + 배포(release)     PATCH /v1beta1/{version}?updateMask=status, POST /v1beta1/sites/{site}/releases

인증은 Google ADC(Application Default Credentials)를 씁니다.
  - CI(GitHub Actions): google-github-actions/auth 가 만든 워크로드 아이덴티티 제휴 자격 증명
  - 로컬: `gcloud auth application-default login` 또는 서비스 계정 키
          (GOOGLE_APPLICATION_CREDENTIALS=/path/key.json)

준비물: pip install google-auth requests

사용 예:
  python3 tools/deploy_firebase.py --project gachi-naming --site gachi-naming --public docs
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://firebasehosting.googleapis.com/v1beta1"
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]
# firebase.json 의 hosting.ignore 기본값과 같은 규칙으로 제외합니다.
DEFAULT_IGNORE = ("firebase.json", ".firebaserc")


def get_token(credentials_file: str | None) -> str:
    try:
        import google.auth
        from google.auth.transport.requests import Request
    except ImportError:  # pragma: no cover
        sys.exit("google-auth 와 requests 가 필요합니다: pip install google-auth requests")

    if credentials_file:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_file
    creds, _ = google.auth.default(scopes=SCOPES)
    creds.refresh(Request())
    return creds.token


def call(method: str, url: str, token: str, body=None, raw: bytes | None = None, ctype=None) -> dict:
    data = raw
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if ctype:
        headers["Content-Type"] = ctype
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            text = resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        sys.exit(f"{method} {url} -> HTTP {exc.code}\n{detail}")
    return json.loads(text) if text.strip() else {}


def iter_files(public_dir: str):
    """배포할 파일을 (Hosting 경로, 실제 경로)로 돌려줍니다. 숨김 파일·node_modules 는 뺍니다."""
    for root, dirs, files in os.walk(public_dir):
        dirs[:] = sorted(d for d in dirs if d != "node_modules" and not d.startswith("."))
        for name in sorted(files):
            full = os.path.join(root, name)
            rel = os.path.relpath(full, public_dir).replace(os.sep, "/")
            parts = rel.split("/")
            if any(p.startswith(".") for p in parts) or "node_modules" in parts:
                continue
            if rel in DEFAULT_IGNORE:
                continue
            yield "/" + rel, full


def hosting_config(config_path: str) -> dict:
    if not os.path.exists(config_path):
        return {}
    conf = json.load(open(config_path, encoding="utf-8")).get("hosting", {})
    if isinstance(conf, list):  # 멀티 사이트 설정은 첫 항목만 사용
        conf = conf[0]
    return {k: v for k, v in conf.items() if k not in {"public", "ignore", "site", "target"}}


def main() -> int:
    ap = argparse.ArgumentParser(description="Firebase Hosting 배포 (REST API)")
    ap.add_argument("--project", required=True, help="Firebase 프로젝트 ID")
    ap.add_argument("--site", help="Hosting 사이트 ID (기본: 프로젝트 ID)")
    ap.add_argument("--public", default="docs", help="배포할 폴더 (기본: docs)")
    ap.add_argument("--config", default="firebase.json", help="firebase.json 경로")
    ap.add_argument("--credentials", help="서비스 계정 키 JSON (생략 시 ADC 사용)")
    args = ap.parse_args()

    site = args.site or args.project
    token = get_token(args.credentials)
    config = hosting_config(args.config)
    print(f"· project {args.project} / site {site} / public {args.public}", flush=True)

    version = call("POST", f"{API}/sites/{site}/versions", token, {"config": config})
    vname = version["name"]
    print(f"· 버전 생성: {vname}", flush=True)

    files: dict[str, str] = {}
    blobs: dict[str, bytes] = {}
    for hosting_path, full in iter_files(args.public):
        zipped = gzip.compress(open(full, "rb").read(), compresslevel=9, mtime=0)
        digest = hashlib.sha256(zipped).hexdigest()
        files[hosting_path] = digest
        blobs[digest] = zipped
    print(f"· 파일 {len(files)}개 해시 계산", flush=True)

    pop = call("POST", f"{API}/{vname}:populateFiles", token, {"files": files})
    need = pop.get("uploadRequiredHashes") or []
    upload_url = pop.get("uploadUrl")
    print(f"· 새로 올릴 파일 {len(need)}개", flush=True)
    for digest in need:
        call("POST", f"{upload_url}/{digest}", token, raw=blobs[digest],
             ctype="application/octet-stream")

    call("PATCH", f"{API}/{vname}?updateMask=status", token, {"status": "FINALIZED"})
    release = call(
        "POST",
        f"{API}/sites/{site}/releases?versionName={urllib.parse.quote(vname, safe='')}",
        token,
        {},
    )
    print(f"· 배포 완료: {release.get('name')} ({release.get('releaseTime')})", flush=True)
    print(f"· 주소: https://{site}.web.app", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
