# Prometheus & Grafana Monitoring Setup

## Prerequisites
- Docker Desktop running
- Blue backend on `localhost:5000`
- Green backend on `localhost:5001`

---

## Step 1 — Start Monitoring Stack (First Time)

```powershell
cd d:\KLU\Capstone\Capstone\Capstone\deployment\monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

**Expected:** Two containers start — `mern-prometheus` (`:9090`) and `mern-grafana` (`:4000`).

---

## Step 2 — Verify Prometheus Targets

1. Open http://localhost:9090/targets
2. You should see **3 targets**:

| Job | Target | Expected State |
|---|---|---|
| `prometheus` | `localhost:9090` | UP |
| `backend-blue` | `host.docker.internal:5000` | UP |
| `backend-green` | `host.docker.internal:5001` | UP |

> **Note:** If a backend isn't running, its target will show **DOWN** — this is normal and does not affect the other targets or the app.

---

## Step 3 — Connect Grafana to Prometheus

1. Open http://localhost:4000
2. Login: `admin` / `admin`
3. Go to **Connections → Data Sources → Add data source**
4. Select **Prometheus**
5. URL: `http://prometheus:9090`
6. Click **Save & Test** → should show ✅

### Useful Queries

| Metric | Query |
|---|---|
| Request rate | `rate(http_requests_total[5m])` |
| By environment | `sum(rate(http_requests_total[5m])) by (environment)` |
| Avg latency | `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])` |
| Error rate | `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` |
| Memory | `process_resident_memory_bytes` |
| CPU | `rate(process_cpu_seconds_total[5m])` |

---

## Safe Restart (After Config Change)

If you edit `prometheus.yml`, restart **only Prometheus**:

```powershell
cd d:\KLU\Capstone\Capstone\Capstone\deployment\monitoring
docker compose -f docker-compose.monitoring.yml restart prometheus
```

**Expected:** Prometheus restarts in ~3 seconds. Grafana stays untouched. No backend impact.

> This will NOT hang. If it takes more than 10 seconds, press Ctrl+C and use the stop/start approach below instead.

---

## Stop/Start Individual Containers

```powershell
# Stop only Prometheus (Grafana keeps running)
docker stop mern-prometheus

# Start it back
docker start mern-prometheus

# Stop only Grafana (Prometheus keeps running)
docker stop mern-grafana

# Start it back
docker start mern-grafana
```

---

## Full Stop (Both Containers)

```powershell
cd d:\KLU\Capstone\Capstone\Capstone\deployment\monitoring
docker compose -f docker-compose.monitoring.yml down
```

**Note:** This preserves data volumes. Add `-v` to also delete stored metrics/dashboards.

---

## Full Rollback (Remove Monitoring Completely)

### 1. Remove containers + data
```powershell
cd d:\KLU\Capstone\Capstone\Capstone\deployment\monitoring
docker compose -f docker-compose.monitoring.yml down -v
```

### 2. Remove prom-client from backend (optional)
```powershell
cd d:\KLU\Capstone\Capstone\Capstone
npm uninstall prom-client
```

### 3. Clean up app.js (optional)
In `backend/shared/app.js`, delete the Prometheus block (lines 12–75).
The `/metrics` endpoint auto-falls back to JSON when `prom-client` is absent.

### 4. Delete config files (optional)
```powershell
Remove-Item d:\KLU\Capstone\Capstone\Capstone\deployment\monitoring\prometheus.yml
Remove-Item d:\KLU\Capstone\Capstone\Capstone\deployment\monitoring\docker-compose.monitoring.yml
```

No other files need changes. The app works identically with or without monitoring.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Target shows **DOWN** | Backend not running | Start backend: `npm run dev:blue` or `dev:green` |
| `connection refused` in Prometheus | `host.docker.internal` not resolving | Ensure Docker Desktop is running, not WSL-only Docker |
| Port 9090 in use | Another Prometheus instance | `docker ps` to find and stop it |
| Port 4000 in use | Another service on 4000 | Change port in `docker-compose.monitoring.yml` |
| Grafana shows "no data" | Data source not configured | Add Prometheus datasource: URL = `http://prometheus:9090` |
| Config changes not applied | Prometheus not restarted | `docker compose restart prometheus` |
| Metrics show JSON not text | `prom-client` not installed | Run `npm install` at project root, restart backend |
