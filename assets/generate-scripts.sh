#!/bin/bash
# Oracle Cloud Canonical Ubuntu 24.04 Image 2026.09.18-0 setup
# 1) Open ports 443 and 80 on Oracle Cloud Infrastructure:
#       Primary VNIC -> Subnet -> Security List -> Security Rules -> Add Ingress Rule
# 2) Set DNS records:
#       Name      Type   Content
#       @         A      Server IP
#       www       A      Server IP
#       docs      A      Server IP
#       template  A      Server IP

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> Generating scripts..."
echo "-> Generating setup.conf..."
cat << 'OUTER_EOF' > setup.conf
DOMAIN_NAME=m7.gs
SUBDOMAIN1=docs
SUBDOMAIN2=template
SUBDOMAIN1_SITE_REPO_URL="https://github.com/g-matheus/redes.git"
OUTER_EOF
chmod 640 setup.conf

# ========================================
# Updates and firewall
echo "-> Generating server-hardening.sh..."
cat << 'OUTER_EOF' > server-hardening.sh
#!/bin/bash

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> Updating packages..."
echo
apt-get update
apt-get upgrade -y
echo
echo "==> Configuring automatic updates..."
echo
apt-get install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now apt-daily.timer
systemctl enable --now apt-daily-upgrade.timer
echo
echo "==> Configuring SSH hardening..."
echo
sed -i -E "s/^#?PasswordAuthentication.*/PasswordAuthentication no/" "/etc/ssh/sshd_config"
sed -i -E "s/^#?PermitRootLogin.*/PermitRootLogin no/" "/etc/ssh/sshd_config"
sed -i -E "s/^#?X11Forwarding.*/X11Forwarding no/" "/etc/ssh/sshd_config"
echo
echo "==> Configuring Firewall (UFW)..."
echo
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw limit ssh
ufw --force enable
echo
echo "==> Restarting SSH service..."
echo
systemctl restart ssh
echo
echo "==> Installing Fail2ban..."
echo
export PYTHONWARNINGS="ignore::SyntaxWarning"
apt-get install -y fail2ban
systemctl enable --now fail2ban
unset PYTHONWARNINGS
echo
echo "==> Done! Restarting server ..."
reboot
OUTER_EOF
chmod 740 server-hardening.sh

# ========================================
# Apache
echo "-> Generating apache2.sh..."
cat << 'OUTER_EOF' > apache2.sh
#!/bin/bash

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

source "$(dirname "$0")/setup.conf"

echo "==> Installing Apache2 ..."
echo
apt-get install -y apache2
echo "-> Configuring global ServerName ..."
tee /etc/apache2/conf-available/servername.conf > /dev/null <<EOF
ServerName $DOMAIN_NAME
EOF
a2enconf servername
systemctl reload apache2
echo "==> Allowing ports 80 and 443 in UFW for Apache2 ..."
echo
ufw allow in "Apache Full"
echo
echo
echo "==> Configuring sites in Apache2 ..."
echo
echo "-> Removing default Apache sites ..."
a2dissite 000-default.conf default-ssl.conf
rm -f /etc/apache2/sites-available/000-default.conf
rm -f /etc/apache2/sites-available/default-ssl.conf
rm -rf /var/www/html
echo "-> Configuring $DOMAIN_NAME ..."
mkdir -p "/var/www/$DOMAIN_NAME"
tee "/etc/apache2/sites-available/$DOMAIN_NAME.conf" > /dev/null <<EOF
<VirtualHost *:80>
    ServerName $DOMAIN_NAME
    ServerAlias www.$DOMAIN_NAME
    DocumentRoot /var/www/$DOMAIN_NAME

    ErrorLog \${APACHE_LOG_DIR}/${DOMAIN_NAME}_error.log
    CustomLog \${APACHE_LOG_DIR}/${DOMAIN_NAME}_access.log combined
</VirtualHost>
EOF
echo "-> Configuring $SUBDOMAIN1.$DOMAIN_NAME ..."
mkdir -p "/var/www/$SUBDOMAIN1.$DOMAIN_NAME"
tee "/etc/apache2/sites-available/$SUBDOMAIN1.$DOMAIN_NAME.conf" > /dev/null <<EOF
<VirtualHost *:80>
    ServerName $SUBDOMAIN1.$DOMAIN_NAME
    DocumentRoot /var/www/$SUBDOMAIN1.$DOMAIN_NAME

    ErrorLog \${APACHE_LOG_DIR}/${SUBDOMAIN1}.${DOMAIN_NAME}_error.log
    CustomLog \${APACHE_LOG_DIR}/${SUBDOMAIN1}.${DOMAIN_NAME}_access.log combined
</VirtualHost>
EOF
echo "-> Configuring $SUBDOMAIN2.$DOMAIN_NAME ..."
mkdir -p "/var/www/$SUBDOMAIN2.$DOMAIN_NAME"
tee "/etc/apache2/sites-available/$SUBDOMAIN2.$DOMAIN_NAME.conf" > /dev/null <<EOF
<VirtualHost *:80>
    ServerName $SUBDOMAIN2.$DOMAIN_NAME
    DocumentRoot /var/www/$SUBDOMAIN2.$DOMAIN_NAME

    ErrorLog \${APACHE_LOG_DIR}/${SUBDOMAIN2}.${DOMAIN_NAME}_error.log
    CustomLog \${APACHE_LOG_DIR}/${SUBDOMAIN2}.${DOMAIN_NAME}_access.log combined
</VirtualHost>
EOF
echo "-> Enabling sites ..."
a2ensite "$DOMAIN_NAME.conf"
a2ensite "$SUBDOMAIN1.$DOMAIN_NAME.conf"
a2ensite "$SUBDOMAIN2.$DOMAIN_NAME.conf"
echo "-> Testing Apache configuration ..."
apache2ctl configtest
echo
echo "==> Done! Restarting server ..."
reboot
OUTER_EOF
chmod 740 apache2.sh

# ========================================
# TLS
echo "-> Generating tls-apache2.sh..."
cat << 'OUTER_EOF' > tls-apache2.sh
#!/bin/bash

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

source "$(dirname "$0")/setup.conf"

echo "==> Configuring TLS ..."
echo
echo "-> Installing certbot ..."
apt install -y certbot python3-certbot-apache
echo "-> Configuring TLS certificates ..."
certbot --apache \
    --non-interactive \
    --agree-tos \
    --redirect \
    --register-unsafely-without-email \
    -d "$DOMAIN_NAME" \
    -d "www.$DOMAIN_NAME" \
    -d "$SUBDOMAIN1.$DOMAIN_NAME" \
    -d "$SUBDOMAIN2.$DOMAIN_NAME"
echo "-> Testing certificate renewal ..."
certbot renew --dry-run
systemctl reload apache2
echo
echo "==> Apache2 installation and TLS configuration completed successfully!"
OUTER_EOF
chmod 740 tls-apache2.sh

# ========================================
# MySQL and PHP

echo "-> Generating mysql-php.sh..."
cat << 'OUTER_EOF' > mysql-php.sh
#!/bin/bash

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

source "$(dirname "$0")/setup.conf"

echo "==> Installing MySQL server..."
echo
apt-get install -y mysql-server

echo "==> Installing PHP..."
echo
apt-get install -y php libapache2-mod-php php-mysql
echo "-> Configuring index.php..."
tee /etc/apache2/mods-enabled/dir.conf > /dev/null << 'EOF'
<IfModule mod_dir.c>
    DirectoryIndex index.php index.html index.cgi index.pl index.xhtml index.htm
</IfModule>
EOF
tee /var/www/$DOMAIN_NAME/index.php > /dev/null << 'EOF'
<?php
phpinfo();
?>
EOF
echo "==> Done! Restarting server..."
reboot
OUTER_EOF
chmod 740 mysql-php.sh

# ========================================
# Deploy site on subdomain1

echo "-> Generating deploy-subdomain1.sh..."
cat << 'OUTER_EOF' > deploy-subdomain1.sh
#!/bin/bash

set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive

source "$(dirname "$0")/setup.conf"
FULL_DOMAIN="${SUBDOMAIN1}.${DOMAIN_NAME}"
WEB_DIR="/var/www/${FULL_DOMAIN}"

echo "==> Deploying site on ${FULL_DOMAIN}..."
echo "-> Cleaning directory ${WEB_DIR}..."
rm -rf /var/www/$FULL_DOMAIN/
echo "-> Cloning repository to ${WEB_DIR}..."
git clone "$SUBDOMAIN1_SITE_REPO_URL" "$WEB_DIR"
echo "-> Setting permissions for ${WEB_DIR}..."
chown -R www-data:www-data "$WEB_DIR"
echo "==> Done! Application deployed at http://${FULL_DOMAIN}"
OUTER_EOF
chmod 740 deploy-subdomain1.sh

# ========================================
echo "==> Setup scripts generated successfully!"
echo "-> Next step: run them with root privileges (e.g., sudo ./server-hardening.sh)"
