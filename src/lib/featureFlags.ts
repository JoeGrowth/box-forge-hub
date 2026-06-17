// Phase 1 cutover flag. Kept hard-coded `true` post-cutover so that the
// expertise-graph projection is the only path. Flip back only for emergency
// rollback to legacy table reads (which still exist in admin/write paths).
export const USE_EXPERTISE_GRAPH = true;
