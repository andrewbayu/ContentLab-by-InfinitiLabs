# Crew client assignments

Settings > Team Members supports multiple client checkboxes for team accounts. All clients is the legacy default and includes future clients. Explicit selections include all brands of selected clients and exclude future clients. No selections is stored as `__none__`, never as an empty value (empty means unrestricted). Client accounts retain a single client; super admins retain all access.

Assignments use the existing comma-separated `Team.client` / `team_members.client_access` field. Client names must not contain commas. Matching is exact, case insensitive; assigned tasks do not override client restrictions.

Production already uses Supabase Auth and RLS in project `jpjsycnbamvxnwmziedh`. The checkout was synchronized to `bf92ed7` before integration. All six existing members are linked to Auth. No new Auth migration or password resets were needed.

Three migrations applied on 2026-10-13 enforce exact client matching, remove the owner/collaborator override, and restrict related comments, documents, resources, notifications and storage objects. Personal documents remain available to their owner. Attachment uploads use task UUID as the first storage path segment; client downloads require a linked client-visible resource. External Drive links follow Drive permissions; existing signed URLs remain usable until expiry.

The operational application uses Supabase. Code.gs is maintained for legacy Sheets compatibility, not as the security boundary. New registry accounts still require Auth provisioning according to AUTH_RLS_CUTOVER.md. Verification includes unit tests, lint, build and rollback-only database checks of excluded owner read/write access.
