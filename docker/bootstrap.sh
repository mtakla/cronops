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
if ! awk -F: -v uid="$uid" '$3==uid {found=1} END {exit !found}' /etc/passwd; then
  adduser -D -u "$uid" -G "$group" cronops
fi

# resolve username by uid
user="$(awk -F: -v uid="$uid" '$3==uid {print $1; exit}' /etc/passwd)"

if [ "$(stat -c '%u' /config)" != "$uid" ];  then
  chown "$uid:$gid" -R /config /data 
  chown "$uid:$gid" /io/source /io/target
fi

# run command with user
exec su-exec "$user" "$@"