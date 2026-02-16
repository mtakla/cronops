#!/bin/sh
set -e

uid="${PUID:-1000}"
gid="${PGID:-1000}"

# get group name by gid (if exists)
group="$(awk -F: -v gid="$gid" '$3==gid {print $1; exit}' /etc/group)"

# ensure group exists
if [ -z "$group" ]; then
  group="cronops"
  addgroup -g "$gid" "$group"
fi

# ensure user exists
awk -F: -v uid="$uid" '$3==uid {found=1} END {exit !found}' /etc/passwd || \
  adduser -D -u "$uid" -G "$group" cronops

# resolve username by uid
user="$(awk -F: -v uid="$uid" '$3==uid {print $1; exit}' /etc/passwd)"

# set ownership
chown -R "$uid:$gid" /app /config /data /io

exec su-exec "$user" "$@"