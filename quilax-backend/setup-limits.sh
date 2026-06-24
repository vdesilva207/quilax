#!/bin/bash

# Script para configurar límites del sistema para alta concurrencia
# Ejecutar con: bash setup-limits.sh

echo "🔧 Configurando límites del sistema para alta concurrencia..."

# 1. Para macOS - Aumentar límites de launchctl
echo "📝 Configurando launchctl limits..."
sudo launchctl limit maxfiles 65536 200000

# 2. Crear /etc/sysctl.conf (si no existe)
if [ ! -f /etc/sysctl.conf ]; then
    echo "📝 Creando /etc/sysctl.conf..."
    sudo touch /etc/sysctl.conf
fi

# 3. Agregar configuraciones de kernel
echo "📝 Configurando parámetros del kernel..."
sudo tee -a /etc/sysctl.conf > /dev/null <<EOL
# Quilax High Concurrency Settings
fs.file-max = 1000000
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_max_tw_buckets = 200000
EOL

# 4. Aplicar configuraciones del kernel
echo "🔄 Aplicando configuraciones del kernel..."
sudo sysctl -p

# 5. Configurar límites de usuario
echo "👤 Configurando límites de usuario..."
if [ ! -f /etc/security/limits.conf ]; then
    sudo touch /etc/security/limits.conf
fi

sudo tee -a /etc/security/limits.conf > /dev/null <<EOL
# Quilax User Limits
* soft nofile 65535
* hard nofile 200000
* soft nproc 32768
* hard nproc 65536
root soft nofile 65535
root hard nofile 200000
EOL

# 6. Crear configuración para sesión actual
echo "🔄 Configurando sesión actual..."
ulimit -n 65535
ulimit -u 32768

# 7. Verificar configuración
echo "✅ Verificando configuración..."
echo "File descriptors (soft): $(ulimit -Sn)"
echo "File descriptors (hard): $(ulimit -Hn)"
echo "Max user processes: $(ulimit -u)"

echo "🎉 Configuración completada!"
echo "⚠️  IMPORTANTE: Reinicia tu terminal o ejecuta 'source ~/.bashrc' para aplicar cambios"
