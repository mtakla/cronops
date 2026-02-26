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

# chown on mounted or unmounted /config & /data dir
for path in /config /data; do
  [ "$(stat -c '%u' "$path")" != "$uid" ] && chown "$uid:$gid" -R "$path"
done

# chown on mounted or unmounted /io dirs
for path in /io /io/source /io/target /io/source2 /io/target2 /io/source3 /io/target3; do
  [ "$(stat -c '%u' "$path")" != "$uid" ] && chown "$uid:$gid" "$path"
done

# run command with user
exec su-exec "$user" "$@"