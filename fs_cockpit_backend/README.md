# FS Cockpit Backend

## Frequently Used Commands

### Install/Update Dependencies
```bash
pip3 install -r requirements.txt --upgrade
```

### Run Development Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Run Production Server
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
Note: Adjust `-w 4` based on your CPU cores (recommended: 2-4 workers per core)
