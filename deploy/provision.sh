#!/usr/bin/env bash
# Provision a DigitalOcean droplet + Cloudflare DNS and deploy DrywallEstimator.
# Env: DO_TOKEN, CF_TOKEN, GH_TOKEN.
set -uo pipefail
: "${DO_TOKEN:?}"; : "${CF_TOKEN:?}"; : "${GH_TOKEN:?}"
LOG=/tmp/drywall.log
echo "PROVISION START $(date)" > "$LOG"
DOH=(-H "Authorization: Bearer $DO_TOKEN")
CFH=(-H "Authorization: Bearer $CF_TOKEN")

# Reuse the existing deploy SSH key (created for SiteAgent)
[ -f /tmp/sa_deploy ] || ssh-keygen -t ed25519 -N "" -f /tmp/sa_deploy -C siteagent-deploy >/dev/null 2>&1
PUB=$(cat /tmp/sa_deploy.pub)
KR=$(curl -s -X POST https://api.digitalocean.com/v2/account/keys "${DOH[@]}" -H 'Content-Type: application/json' -d "{\"name\":\"siteagent-deploy\",\"public_key\":\"$PUB\"}")
KEYID=$(echo "$KR" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["ssh_key"]["id"] if "ssh_key" in d else "")')
if [ -z "$KEYID" ]; then
  FP=$(ssh-keygen -E md5 -lf /tmp/sa_deploy.pub | awk '{print $2}' | sed 's/^MD5://')
  KEYID=$(curl -s "${DOH[@]}" https://api.digitalocean.com/v2/account/keys | python3 -c "import sys,json;d=json.load(sys.stdin);print(next((str(k['id']) for k in d.get('ssh_keys',[]) if k.get('fingerprint')=='$FP'),''))")
fi
echo "KEYID=$KEYID" >> "$LOG"

DID=$(curl -s "${DOH[@]}" "https://api.digitalocean.com/v2/droplets?tag_name=drywall" | python3 -c 'import sys,json;ds=json.load(sys.stdin).get("droplets",[]);print(ds[0]["id"] if ds else "")')
if [ -z "$DID" ]; then
  CR=$(curl -s -X POST https://api.digitalocean.com/v2/droplets "${DOH[@]}" -H 'Content-Type: application/json' -d "{\"name\":\"drywall-estimator\",\"region\":\"tor1\",\"size\":\"s-1vcpu-2gb\",\"image\":\"ubuntu-24-04-x64\",\"ssh_keys\":[$KEYID],\"tags\":[\"drywall\"]}")
  DID=$(echo "$CR" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("droplet",{}).get("id",""))')
fi
echo "DID=$DID" >> "$LOG"
IP=""
for i in $(seq 1 60); do
  IP=$(curl -s "${DOH[@]}" https://api.digitalocean.com/v2/droplets/$DID | python3 -c 'import sys,json;d=json.load(sys.stdin).get("droplet",{});v=[n["ip_address"] for n in d.get("networks",{}).get("v4",[]) if n.get("type")=="public"];print(v[0] if v else "")')
  [ -n "$IP" ] && break; sleep 5
done
echo "IP=$IP" >> "$LOG"; echo "$IP" > /tmp/drywall_ip
[ -z "$IP" ] && { echo "NO IP"; exit 1; }

ZONE=$(curl -s "${CFH[@]}" "https://api.cloudflare.com/client/v4/zones?name=halfcup.ca" | python3 -c 'import sys,json;r=json.load(sys.stdin).get("result",[]);print(r[0]["id"] if r else "")')
EX=$(curl -s "${CFH[@]}" "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records?type=A&name=drywall.halfcup.ca" | python3 -c 'import sys,json;r=json.load(sys.stdin).get("result",[]);print(r[0]["id"] if r else "")')
DATA="{\"type\":\"A\",\"name\":\"drywall\",\"content\":\"$IP\",\"proxied\":false,\"ttl\":60}"
if [ -n "$EX" ]; then curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records/$EX" "${CFH[@]}" -H 'Content-Type: application/json' -d "$DATA" >/dev/null;
else curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" "${CFH[@]}" -H 'Content-Type: application/json' -d "$DATA" >/dev/null; fi
echo "DNS drywall -> $IP" >> "$LOG"

SSHOPT=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=8 -i /tmp/sa_deploy)
for i in $(seq 1 60); do ssh "${SSHOPT[@]}" root@$IP true 2>/dev/null && { echo "ssh ready" >> "$LOG"; break; }; sleep 5; done

DBP=$(openssl rand -hex 16); DBR=$(openssl rand -hex 16); JWT=$(openssl rand -hex 24); OID=$(openssl rand -hex 12)
cat > /tmp/drywall_remote.sh <<REMOTE
#!/usr/bin/env bash
set -e
export DEBIAN_FRONTEND=noninteractive
systemctl stop unattended-upgrades apt-daily.timer apt-daily-upgrade.timer 2>/dev/null || true
echo 'DPkg::Lock::Timeout "600";' > /etc/apt/apt.conf.d/99lock
if ! command -v docker >/dev/null 2>&1; then
  ( fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab ) || true
  for t in 1 2 3; do curl -fsSL https://get.docker.com | sh && break; sleep 15; done
fi
rm -rf /root/drywall
git clone --depth 1 --branch main https://${GH_TOKEN}@github.com/halfcupcanada/DrywallEstimator.git /root/drywall
cd /root/drywall/deploy
cat > .env <<ENVEOF
SITE=drywall.halfcup.ca
DB_PASSWORD=${DBP}
DB_ROOT_PASSWORD=${DBR}
JWT_SECRET=${JWT}
OWNER_OPEN_ID=${OID}
VITE_APP_ID=
ENVEOF
echo "BUILD START \$(date)"
docker compose build
docker compose up -d
docker compose ps
echo "REMOTE_DONE \$(date)"
REMOTE

scp "${SSHOPT[@]}" /tmp/drywall_remote.sh root@$IP:/root/remote.sh >> "$LOG" 2>&1
ssh "${SSHOPT[@]}" root@$IP "chmod +x /root/remote.sh; nohup setsid bash /root/remote.sh > /root/build.log 2>&1 < /dev/null & echo LAUNCHED" >> "$LOG" 2>&1
echo "PROVISION_DONE $(date) IP=$IP" >> "$LOG"
