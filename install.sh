#!/bin/sh
# Brandywine one-line installer:
#
#   curl -fsSL https://raw.githubusercontent.com/yaneczech/Brandywine/main/install.sh | sh
#
# Downloads the latest Brandywine release into ~/brandywine (/opt/brandywine
# when run as root) and starts the setup wizard. Options are passed on to
# `./brandywine install`, e.g. `sh -s -- --domain brand.example.com`.
#
# BRANDYWINE_DIR  install folder     BRANDYWINE_REF  release tag or branch to install
set -eu

REPO=https://github.com/yaneczech/Brandywine
API=https://api.github.com/repos/yaneczech/Brandywine

if [ -t 1 ]; then
	BOLD=$(printf '\033[1m'); RED=$(printf '\033[31m'); DIM=$(printf '\033[2m'); RESET=$(printf '\033[0m')
else
	BOLD=''; RED=''; DIM=''; RESET=''
fi
fail() { printf '%sError:%s %s\n' "$RED" "$RESET" "$1" >&2; exit 1; }

# The wizard needs the keyboard even though this script arrives through a pipe
TTY=''
if [ -t 0 ]; then TTY=/dev/stdin; elif (: < /dev/tty) 2>/dev/null; then TTY=/dev/tty; fi

ask_yes() {
	[ -n "$TTY" ] || return 1
	printf '%s [y/N]: ' "$1"
	read -r answer < "$TTY" || answer=''
	case "$answer" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

printf '\n%sBrandywine%s — brand manual and asset library\n' "$BOLD" "$RESET"

# ── Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
	printf '\nBrandywine runs in Docker, which is not installed yet.\n'
	if [ "$(uname -s)" = Linux ] && ask_yes 'Install Docker now with the official script from get.docker.com?'; then
		command -v curl >/dev/null 2>&1 || fail 'curl is needed to install Docker.'
		if [ "$(id -u)" = 0 ]; then curl -fsSL https://get.docker.com | sh
		else curl -fsSL https://get.docker.com | sudo sh; fi
	else
		case "$(uname -s)" in
			Darwin) printf '%sInstall Docker Desktop: https://docs.docker.com/desktop/setup/install/mac-install/%s\n' "$DIM" "$RESET" ;;
			*) printf '%sInstall Docker: https://docs.docker.com/engine/install/%s\n' "$DIM" "$RESET" ;;
		esac
		fail 'Install Docker, then run this installer again.'
	fi
fi

# ── Download ───────────────────────────────────────────────────────────────
if [ "$(id -u)" = 0 ]; then default_dir=/opt/brandywine; else default_dir="$HOME/brandywine"; fi
DIR=${BRANDYWINE_DIR:-$default_dir}

REF=${BRANDYWINE_REF:-}
if [ -z "$REF" ] && command -v curl >/dev/null 2>&1; then
	REF=$(curl -fsSL "$API/releases/latest" 2>/dev/null | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1) || REF=''
fi
[ -n "$REF" ] || REF=main

if [ -x "$DIR/brandywine" ]; then
	printf 'Brandywine is already downloaded in %s.\n' "$DIR"
else
	printf 'Downloading Brandywine %s into %s…\n' "$REF" "$DIR"
	mkdir -p "$(dirname "$DIR")"
	if command -v git >/dev/null 2>&1; then
		git clone --quiet --depth 1 --branch "$REF" "$REPO.git" "$DIR" 2>/dev/null \
			|| git clone --quiet --depth 1 "$REPO.git" "$DIR"
	elif command -v curl >/dev/null 2>&1 && command -v tar >/dev/null 2>&1; then
		mkdir -p "$DIR"
		curl -fsSL "$REPO/archive/$REF.tar.gz" | tar -xz -C "$DIR" --strip-components 1
	else
		fail 'git, or curl and tar, are needed to download Brandywine.'
	fi
fi

cd "$DIR"
# Releases have ready-made images tagged with the same version
case "$REF" in v[0-9]*) BRANDYWINE_VERSION=${REF#v}; export BRANDYWINE_VERSION ;; esac

if [ -n "$TTY" ]; then
	exec ./brandywine install "$@" < "$TTY"
else
	exec ./brandywine install --yes "$@"
fi
