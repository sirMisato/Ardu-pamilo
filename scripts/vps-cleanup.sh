#!/usr/bin/env bash
set -Eeuo pipefail

dry_run="${PAMILO_CLEANUP_DRY_RUN:-false}"
deploy_root="${PAMILO_DEPLOY_ROOT:-/opt/pamilo}"
active_deploy_path="${PAMILO_ACTIVE_DEPLOY_PATH:-/opt/pamilo/production}"
legacy_projects="${PAMILO_LEGACY_PROJECTS:-}"
legacy_paths="${PAMILO_LEGACY_PATHS:-}"
remove_legacy_volumes="${PAMILO_CLEANUP_REMOVE_LEGACY_VOLUMES:-false}"
container_prune_until="${PAMILO_CONTAINER_PRUNE_UNTIL:-24h}"
builder_prune_until="${PAMILO_BUILDER_PRUNE_UNTIL:-168h}"

log() {
  printf '[pamilo-cleanup] %s\n' "$*"
}

die() {
  printf '[pamilo-cleanup] ERROR: %s\n' "$*" >&2
  exit 1
}

run() {
  if [ "$dry_run" = "true" ]; then
    printf '[pamilo-cleanup] dry-run:'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

if docker info >/dev/null 2>&1; then
  docker_cmd=(docker)
elif command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
  docker_cmd=(sudo -n docker)
else
  die "Docker is not available or the current user cannot access it."
fi

dock() {
  "${docker_cmd[@]}" "$@"
}

require_safe_project_name() {
  case "$1" in
    ""|*[!A-Za-z0-9_.-]*)
      die "Unsafe Docker Compose project name: $1"
      ;;
  esac
}

resolve_safe_path() {
  local input_path="$1"
  local resolved_root
  local resolved_path
  local resolved_active

  case "$input_path" in
    /*) ;;
    *) die "Legacy path must be absolute: $input_path" ;;
  esac

  resolved_root="$(realpath -m "$deploy_root")"
  resolved_path="$(realpath -m "$input_path")"
  resolved_active="$(realpath -m "$active_deploy_path")"

  case "$resolved_path" in
    "$resolved_root"/*) ;;
    *) die "Refusing to clean path outside $resolved_root: $resolved_path" ;;
  esac

  if [ "$resolved_path" = "$resolved_root" ] || [ "$resolved_path" = "$resolved_active" ]; then
    die "Refusing to clean protected path: $resolved_path"
  fi

  printf '%s' "$resolved_path"
}

print_inventory() {
  log "Docker version"
  dock --version || true
  dock compose version || true

  log "Docker Compose projects"
  dock compose ls || true

  log "Containers"
  dock ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Labels}}' || true

  log "Dangling images"
  dock image ls --filter dangling=true || true

  log "Docker disk usage"
  dock system df || true

  log "User crontab"
  crontab -l || true

  if command -v systemctl >/dev/null 2>&1; then
    log "System timers"
    systemctl list-timers --all --no-pager || true

    log "PAMILO/Docker related services"
    systemctl list-units --type=service --all --no-pager | awk 'tolower($0) ~ /pamilo|docker/ { print }' || true
  fi
}

remove_legacy_project() {
  local project="$1"
  local container_ids
  local network_ids
  local volume_ids

  require_safe_project_name "$project"

  log "Cleaning explicit legacy Docker project: $project"

  container_ids="$(dock ps -aq --filter "label=com.docker.compose.project=$project" || true)"
  if [ -n "$container_ids" ]; then
    # shellcheck disable=SC2086
    run "${docker_cmd[@]}" rm -f $container_ids
  else
    log "No containers found for project $project"
  fi

  network_ids="$(dock network ls -q --filter "label=com.docker.compose.project=$project" || true)"
  if [ -n "$network_ids" ]; then
    # shellcheck disable=SC2086
    run "${docker_cmd[@]}" network rm $network_ids || true
  fi

  if [ "$remove_legacy_volumes" = "true" ]; then
    volume_ids="$(dock volume ls -q --filter "label=com.docker.compose.project=$project" || true)"
    if [ -n "$volume_ids" ]; then
      # shellcheck disable=SC2086
      run "${docker_cmd[@]}" volume rm $volume_ids
    fi
  else
    log "Volume removal disabled for project $project"
  fi
}

remove_legacy_path() {
  local path="$1"
  local safe_path

  safe_path="$(resolve_safe_path "$path")"

  if [ ! -e "$safe_path" ]; then
    log "Legacy path does not exist: $safe_path"
    return 0
  fi

  log "Removing explicit legacy path: $safe_path"
  run rm -rf -- "$safe_path"
}

split_list() {
  printf '%s' "$1" | tr ',\n\t' '   '
}

main() {
  log "Starting VPS cleanup. dry_run=$dry_run deploy_root=$deploy_root active_deploy_path=$active_deploy_path"
  print_inventory

  for project in $(split_list "$legacy_projects"); do
    remove_legacy_project "$project"
  done

  for path in $(split_list "$legacy_paths"); do
    remove_legacy_path "$path"
  done

  log "Pruning stopped containers older than $container_prune_until"
  run "${docker_cmd[@]}" container prune -f --filter "until=$container_prune_until"

  log "Pruning dangling Docker images"
  run "${docker_cmd[@]}" image prune -f

  log "Pruning build cache older than $builder_prune_until"
  run "${docker_cmd[@]}" builder prune -f --filter "until=$builder_prune_until"

  log "Post-cleanup Docker disk usage"
  dock system df || true
  log "Cleanup complete"
}

main "$@"

