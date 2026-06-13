#!/bin/bash
# Usage: ./scripts/ota-rollback.sh <channel> [<previous-update-group-id>]
# Example (rollback to embedded bundle):  ./scripts/ota-rollback.sh production
# Example (rollback to specific group):   ./scripts/ota-rollback.sh production abc-123-def
#
# If no group ID is provided, rolls back to the "embedded" (app store build) update.
# Run `eas update:list --channel <channel> --limit 5` first to find a group ID.

set -euo pipefail

CHANNEL="${1:-}"
GROUP_ID="${2:-}"

if [ -z "$CHANNEL" ]; then
  echo "Error: channel argument is required."
  echo "Usage: $0 <channel> [group-id]"
  exit 1
fi

if [ -z "$GROUP_ID" ]; then
  echo "Rolling back channel '$CHANNEL' to embedded bundle..."
  eas update --channel "$CHANNEL" --rollback-to-embedded --non-interactive
else
  echo "Rolling back channel '$CHANNEL' to update group '$GROUP_ID'..."
  eas update:republish --channel "$CHANNEL" --group "$GROUP_ID" --non-interactive
fi

echo ""
echo "Rollback complete."
echo "  Channel : $CHANNEL"
echo "  Target  : ${GROUP_ID:-embedded bundle}"
