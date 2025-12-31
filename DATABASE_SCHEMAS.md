# Database Schemas (MongoDB / Mongoose)

This document describes the MongoDB collections as implemented in `lib/models/*`.

## Conventions

- All collections use Mongoose `timestamps: true` unless otherwise noted.
  - This adds `createdAt` and `updatedAt`.
- References are stored as `ObjectId` values.
- Unless specified, fields are optional if they are not marked as `required: true` in the schema.

---

## Collection: `users` (Model: `User`)

**Primary purpose**: Authentication + subscription/account metadata.

### Fields

- `_id`: `ObjectId`
- `email`: `string`
  - required
  - unique
  - lowercase
  - trimmed
- `passwordHash`: `string`
  - required
- `name`: `string`
  - required
  - trimmed
- `role`: `'user' | 'admin'`
  - default: `'user'`
- `plan`: `'free' | 'pro' | 'lifetime'`
  - default: `'free'`
- `subscriptionStatus`: `'none' | 'active' | 'past_due' | 'canceled'`
  - default: `'none'`
- `subscriptionStartedAt`: `Date`
- `subscriptionEndsAt`: `Date`
- `hasPurchasedLifetime`: `boolean`
  - default: `false`
- `stripeCustomerId`: `string`
- `stripeLastSessionId`: `string`
- `lastLoginAt`: `Date`
- `isDisabled`: `boolean`
  - default: `false`
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ email: 1 }`
- `{ role: 1 }`
- `{ plan: 1 }`
- `{ subscriptionStatus: 1 }`
- `{ hasPurchasedLifetime: 1 }`
- `{ stripeCustomerId: 1 }`
- `{ stripeLastSessionId: 1 }`
- `{ createdAt: -1 }`

---

## Collection: `tasks` (Model: `Task`)

**Primary purpose**: Task management, analytics, planning, and time tracking.

### Enums

- `status`: `'todo' | 'doing' | 'hold' | 'done' | 'archived'`
- `priority`: `'low' | 'medium' | 'high' | 'urgent'`
- `estimationResult.accuracyCategory`: `'underestimated' | 'overestimated' | 'accurate'`

### Fields

- `_id`: `ObjectId`
- `userId`: `ObjectId` (ref: `User`)
  - required
- `title`: `string`
  - required
  - trimmed
- `description`: `string`
  - default: `''`
- `status`: `TaskStatus`
  - default: `'todo'`
- `priority`: `TaskPriority`
  - default: `'medium'`
- `dueDate`: `Date | null`
  - default: `null`
- `startAt`: `Date | null`
  - default: `null`
- `completedAt`: `Date | null`
  - default: `null`
- `tags`: `ObjectId[]` (ref: `Tag`)
- `estimatedMinutes`: `number | null`
  - default: `null`
- `actualMinutes`: `number | null`
  - default: `null`

### Embedded object: `estimationResult`

- `estimatedMinutes`: `number | null`
- `actualMinutes`: `number | null`
- `deltaMinutes`: `number | null`
- `deltaPercent`: `number | null`
- `accuracyCategory`: `'underestimated' | 'overestimated' | 'accurate' | null`
- `accuracyScore`: `number | null`
- `thresholdPct`: `number | null`
- `computedAt`: `Date | null`

### Embedded object: `timeTracking`

- `totalSeconds`: `number`
  - default: `0`
- `isRunning`: `boolean`
  - default: `false`
- `lastStartedAt`: `Date | null`
  - default: `null`
- `sessions`: array of
  - `startedAt`: `Date` (required)
  - `endedAt`: `Date` (required)
  - `durationSeconds`: `number` (required)
  - default for sessions: `[]`

### Embedded array: `subtasks`

- array of
  - `title`: `string` (required, trimmed)
  - `isDone`: `boolean` (default: `false`)
  - `createdAt`: `Date` (default: `Date.now`)
  - `doneAt`: `Date | null` (default: `null`)
- default: `undefined`

### Embedded object: `completionReflection`

- `completionRate`: `number | null`
- `notes`: `string` (default: `''`)
- `createdAt`: `Date | null`
- `updatedAt`: `Date | null`
- `autoSuggestionsAccepted`: `boolean | null`

### Embedded object: `doneTransitionMeta`

- `lastStatus`: `TaskStatus | null`
- `doneAt`: `Date | null`
- `doneTriggeredReflectionAt`: `Date | null`

### Other fields

- `originalTaskId`: `ObjectId | null`
  - default: `null`
- `isPinned`: `boolean`
  - default: `false`
- `reopenCount`: `number`
  - default: `0`
- `priorityChangeCount`: `number`
  - default: `0`
- `lastStatusChangedAt`: `Date | null`
  - default: `null`
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ userId: 1 }`
- `{ userId: 1, status: 1 }`
- `{ userId: 1, completedAt: 1 }`
- `{ userId: 1, dueDate: 1 }`
- `{ userId: 1, tags: 1 }`
- `{ userId: 1, lastStatusChangedAt: 1 }`
- `{ userId: 1, createdAt: -1 }`
- `{ userId: 1, isPinned: -1, createdAt: -1 }`

---

## Collection: `taggroups` (Model: `TagGroup`)

**Primary purpose**: User-defined tag groups.

### Fields

- `_id`: `ObjectId`
- `userId`: `ObjectId` (ref: `User`)
  - required
- `name`: object
  - `en`: `string` (required, trimmed)
  - `ar`: `string` (required, trimmed)
- `color`: `string`
  - required
  - default: `#6366f1`
- `icon`: `string`
  - required
  - default: `tag`
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ userId: 1 }`
- `{ userId: 1, createdAt: -1 }`

---

## Collection: `tags` (Model: `Tag`)

**Primary purpose**: User-defined tags inside a tag group.

### Fields

- `_id`: `ObjectId`
- `userId`: `ObjectId` (ref: `User`)
  - required
- `groupId`: `ObjectId` (ref: `TagGroup`)
  - required
- `name`: object
  - `en`: `string` (required, trimmed)
  - `ar`: `string` (required, trimmed)
- `color`: `string | null`
  - default: `null`
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ userId: 1 }`
- `{ groupId: 1 }`
- `{ userId: 1, groupId: 1 }`

---

## Collection: `clientshares` (Model: `ClientShare`)

**Primary purpose**: Token-based read-only share links for clients (public `/share/[token]`).

### Enums

- `defaultLanguage`: `'en' | 'ar'`

### Fields

- `_id`: `ObjectId`
- `userId`: `ObjectId` (ref: `User`)
  - required
- `tagId`: `ObjectId` (ref: `Tag`)
  - required
- `token`: `string`
  - required
  - unique
  - indexed
- `title`: `string`
  - required
  - trimmed
  - max length: `120`
- `isActive`: `boolean`
  - default: `true`
  - indexed
- `defaultLanguage`: `'en' | 'ar'`
  - default: `'en'`
- `expiresAt`: `Date | null`
  - default: `null`
  - indexed
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ userId: 1, tagId: 1 }`
- `{ userId: 1, isActive: 1 }`

---

## Collection: `workspacevariables` (Model: `WorkspaceVariable`)

**Primary purpose**: Store user “workspace variables” (currently stored as strings; values may be E2EE ciphertext).

### Fields

- `_id`: `ObjectId`
- `userId`: `ObjectId` (ref: `User`)
  - required
- `key`: `string`
  - required
  - trimmed
- `value`: `string`
  - required
- `tag`: `string | null`
  - default: `null`
  - trimmed
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ userId: 1, key: 1 }` (unique)
- `{ userId: 1, createdAt: -1 }`

---

## Collection: `settings` (Model: `Settings`)

**Primary purpose**: Global key/value settings.

### Fields

- `_id`: `ObjectId`
- `key`: `string`
  - required
  - unique
- `value`: `Mixed` (any JSON-like value)
  - required
- `createdAt`: `Date` (timestamps)
- `updatedAt`: `Date` (timestamps)

### Indexes

- `{ key: 1 }`
