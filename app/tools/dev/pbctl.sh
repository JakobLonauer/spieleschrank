#!/bin/bash
# pbctl.sh start <datadir> [hooks] [migrations] [public] | stop
S=${DEV_DIR:-/tmp/spieleschrank-dev}   # enthält pbbin/pocketbase (offizielles Release)
case "$1" in
  stop) pkill -x pocketbase; sleep 0.7 ;;
  start)
    pkill -x pocketbase; sleep 0.5
    ARGS="--http 127.0.0.1:8090 --dir $2"
    [ -n "$3" ] && ARGS="$ARGS --hooksDir $3"
    [ -n "$4" ] && ARGS="$ARGS --migrationsDir $4"
    [ -n "$5" ] && ARGS="$ARGS --publicDir $5"
    nohup $S/pbbin/pocketbase serve $ARGS > $S/pb.log 2>&1 &
    for i in $(seq 1 40); do curl -s http://127.0.0.1:8090/api/health >/dev/null && break; sleep 0.25; done ;;
esac
