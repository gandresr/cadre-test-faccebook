/**
 * Concrete error subclasses for the data layer.
 *
 * Route handlers should `instanceof`-match these to pick the right HTTP
 * status code. Every constructor takes a message that names the offending
 * input — generic messages are forbidden (see CLAUDE.md § Engineering rules).
 */

export class DataLayerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — input failed validation (shape, range, charset). */
export class ValidationError extends DataLayerError {}

/** 401 — caller is not authenticated. Throw only from helpers that expect a session. */
export class UnauthenticatedError extends DataLayerError {}

/** 403 — caller is authenticated but lacks permission for this operation. */
export class NotAuthorizedError extends DataLayerError {}

/** 404 — user document does not exist. */
export class UserNotFoundError extends DataLayerError {}

/** 404 — wall post does not exist (or is soft-deleted). */
export class WallPostNotFoundError extends DataLayerError {}

/** 404 — no friendship doc between the two users. */
export class FriendshipNotFoundError extends DataLayerError {}

/** 409 — friendship already exists; attempted to create duplicate. */
export class FriendshipAlreadyExistsError extends DataLayerError {}

/** 404 — friend request doc does not exist. */
export class FriendRequestNotFoundError extends DataLayerError {}

/** 409 — duplicate outgoing friend request. */
export class FriendRequestAlreadyExistsError extends DataLayerError {}
