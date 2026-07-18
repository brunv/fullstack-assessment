#!/usr/bin/env bash
set -eE

UNAME="$(uname -s)"
case "$UNAME" in
  Darwin*)                          OS="mac" ;;
  Linux*)
    if grep -qi microsoft /proc/version 2>/dev/null; then OS="wsl"; else OS="linux"; fi
    ;;
  MINGW*|MSYS*|CYGWIN*)             OS="windows" ;;
  *)                                OS="unknown" ;;
esac

on_error() {
  local ec=$?
  local ln=${1:-?}
  echo "" >&2
  echo "[dev.sh] Failed at line $ln (exit $ec)" >&2
  if [[ "$OS" == "windows" && -t 0 ]]; then
    read -r -n 1 -p "Press any key to close..." _ || true
    echo "" >&2
  fi
  exit "$ec"
}
trap 'on_error $LINENO' ERR

PLATFORM="${MOBILE_PLATFORM:-}"
if [[ -z "$PLATFORM" ]]; then
  if [[ "$OS" != "mac" ]]; then
    PLATFORM="android"
  elif [[ -t 0 ]]; then
    echo "Which mobile platform?"
    echo "  1) iOS (default)"
    echo "  2) Android"
    read -r -p "> " choice
    case "$choice" in
      2|android|a) PLATFORM="android" ;;
      *)           PLATFORM="ios" ;;
    esac
  else
    PLATFORM="ios"
  fi
fi

if [[ "$PLATFORM" == "ios" && "$OS" != "mac" ]]; then
  echo "iOS builds require macOS with Xcode. Use MOBILE_PLATFORM=android or run on a Mac." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${METRO_PID:-}" ]]; then
    kill "$METRO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# A previous run that got killed abruptly (common on Windows, where signals
# don't always reach background jobs) can leave Metro orphaned on port 8081.
# `expo start` can't prompt for an alternate port in non-interactive mode, so
# it just fails — free the port ourselves if a stale Node process owns it.
# Delegated to Node (free-port.js) rather than parsed inline: native Windows
# tools like tasklist/netstat go through git-bash's argv/CRLF handling when
# invoked from a bash script, which mangles their output; Node's execFileSync
# calls them directly and gets clean output.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
free_port() {
  node "$REPO_ROOT/scripts/free-port.js" "$1"
}

if [[ "$PLATFORM" == "android" ]]; then
  if [[ -z "${ANDROID_HOME:-}" ]]; then
    case "$OS" in
      mac)          CANDIDATES=("$HOME/Library/Android/sdk") ;;
      linux|wsl)    CANDIDATES=("$HOME/Android/Sdk" "$HOME/android-sdk") ;;
      windows)      CANDIDATES=("$LOCALAPPDATA/Android/Sdk" "$HOME/AppData/Local/Android/Sdk") ;;
      *)            CANDIDATES=() ;;
    esac
    for c in "${CANDIDATES[@]}"; do
      if [[ -d "$c" ]]; then
        export ANDROID_HOME="$c"
        break
      fi
    done
    if [[ -z "${ANDROID_HOME:-}" ]]; then
      echo "ANDROID_HOME not set and Android SDK not found in default locations. Install Android Studio or export ANDROID_HOME." >&2
      exit 1
    fi
  fi

  if [[ -z "${JAVA_HOME:-}" ]]; then
    case "$OS" in
      mac)
        for c in "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"; do
          [[ -d "$c" ]] && export JAVA_HOME="$c" && break
        done
        ;;
      linux|wsl)
        for c in /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-17-openjdk /usr/lib/jvm/temurin-17-jdk-amd64; do
          [[ -d "$c" ]] && export JAVA_HOME="$c" && break
        done
        ;;
      windows)
        for c in "/c/Program Files/Android/Android Studio/jbr" "/c/Program Files/Eclipse Adoptium/jdk-17"; do
          [[ -d "$c" ]] && export JAVA_HOME="$c" && break
        done
        ;;
    esac
  fi

  export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"

  if ! adb devices | tail -n +2 | grep -q "device$"; then
    AVD="$(emulator -list-avds | head -n 1 || true)"
    if [[ -z "$AVD" ]]; then
      echo "No connected device and no AVDs found. Create one in Android Studio." >&2
      exit 1
    fi
    echo "Booting Android emulator: $AVD"
    if [[ "$OS" == "windows" ]]; then
      "$ANDROID_HOME/emulator/emulator.exe" -avd "$AVD" >/dev/null 2>&1 &
    else
      nohup emulator -avd "$AVD" >/dev/null 2>&1 &
    fi
    adb wait-for-device
    until [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
      sleep 2
    done
  fi

  # Tunnel host ports into the device so `localhost:PORT` inside the app
  # reaches the dev machine — works for both emulator and USB device, and
  # keeps the mobile code free of platform-specific host overrides.
  # 8000 = Django API, 9000 = MinIO (presigned URLs point at localhost:9000).
  adb reverse tcp:8000 tcp:8000 >/dev/null
  adb reverse tcp:9000 tcp:9000 >/dev/null
fi

free_port 8081

npx expo start --dev-client &
METRO_PID=$!

until (exec 3<>/dev/tcp/localhost/8081) 2>/dev/null; do
  if ! kill -0 "$METRO_PID" 2>/dev/null; then
    echo "Metro exited before becoming ready" >&2
    exit 1
  fi
  sleep 0.5
done
exec 3<&- 2>/dev/null || true

if [[ "$PLATFORM" == "ios" ]]; then
  npx expo run:ios --no-bundler
else
  npx expo run:android --no-bundler
fi

wait "$METRO_PID"
