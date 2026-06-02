# Compulysis – Kubernetes Deployment Guide (Minikube on AWS EC2)

## Prerequisites (run once on your EC2 instance)

```bash
# 1. Install Docker
sudo apt-get update && sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # re-login after this

# 2. Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 3. Install minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# 4. Start minikube with Docker driver and enable metrics-server (needed for HPA)
minikube start --driver=docker --cpus=2 --memory=3072
minikube addons enable metrics-server
minikube addons enable dashboard
```

---

## Deploy Compulysis

Copy all YAML files into a folder (e.g., `~/k8s/`) and apply them in order:

```bash
# Step 1 – Persistent storage for PostgreSQL
kubectl apply -f db-pvc.yaml

# Step 2 – Database Deployment + Service
kubectl apply -f db-deployment.yaml
kubectl apply -f db-service.yaml

# Step 3 – Wait for the database pod to be Ready
kubectl wait --for=condition=ready pod -l app=compulysis-db --timeout=120s
# 1. Apply the ConfigMap first
kubectl apply -f frontend-nginx-configmap.yaml

# Step 4 – Web server Deployment + Service
kubectl apply -f web-deployment.yaml
kubectl apply -f web-service.yaml

# Step 5 – HorizontalPodAutoscaler
kubectl apply -f web-hpa.yaml
```

### Verify everything is running

```bash
kubectl get pods
kubectl get deployments
kubectl get services
kubectl get pvc
kubectl get hpa
```

All pods should show STATUS = Running and READY = 1/1 (or 2/2 for the web deployment).

---

## Expose the application externally (two tunnels)

Open **two separate SSH sessions** (or use `nohup` / `tmux`) on the EC2 instance.

### Tunnel 1 – Web application

```bash
minikube service compulysis-web-service --url
```

Copy the printed URL (e.g. `http://192.168.49.2:30080`).  
To make it reachable from outside EC2, forward it with:

```bash
# Run in the background; replace PORT with the minikube-assigned port
nohup kubectl port-forward service/compulysis-web-service 8080:8000 --address 0.0.0.0 &
```

Then open the EC2 Security Group to allow inbound TCP on port **8080**.  
Access via `http://<EC2-PUBLIC-IP>:8080`.

### Tunnel 2 – Minikube Dashboard

```bash
# In a second terminal
minikube dashboard --url &
# Then forward the dashboard port to 0.0.0.0
nohup kubectl port-forward -n kubernetes-dashboard \
  service/kubernetes-dashboard 9090:80 --address 0.0.0.0 &
```

Open EC2 Security Group for inbound TCP on port **9090**.  
Access via `http://<EC2-PUBLIC-IP>:9090`.

---

## Verify HPA auto-scaling

```bash
# Watch HPA status in real time
kubectl get hpa -w

# Generate load to trigger scale-up (run in a separate terminal)
kubectl run -i --tty load-generator --rm --image=busybox:1.28 \
  --restart=Never -- /bin/sh -c \
  "while sleep 0.01; do wget -q -O- http://compulysis-web-service:8000/health; done"
```

You should see the replica count increase under `kubectl get pods` as CPU usage climbs above 50 %.

---

## File summary

| File | Purpose |
|---|---|
| `db-pvc.yaml` | 1 Gi PersistentVolumeClaim for PostgreSQL data |
| `db-deployment.yaml` | PostgreSQL 16 Deployment with PVC attached |
| `db-service.yaml` | NodePort Service for PostgreSQL (port 30054) |
| `web-deployment.yaml` | Compulysis FastAPI Deployment (2 initial replicas) |
| `web-service.yaml` | NodePort Service for web app (port 30080) |
| `web-hpa.yaml` | HPA: 2–10 replicas, scales at 50 % CPU / 70 % memory |

---

## Teardown

```bash
kubectl delete -f web-hpa.yaml
kubectl delete -f web-service.yaml
kubectl delete -f web-deployment.yaml
kubectl delete -f db-service.yaml
kubectl delete -f db-deployment.yaml
kubectl delete -f db-pvc.yaml   # WARNING: deletes DB data
minikube stop
```
