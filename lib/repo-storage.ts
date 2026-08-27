/**
 * repo-storage.ts
 *
 * Local implementation. Re-exports the local, Freestyle-free storage layer.
 * Persists project metadata + conversations on disk under
 * ~/.kanam-forge/projects/<id>/. See repo-storage-local.ts for details.
 */

export * from "./docker/repo-storage-local";
