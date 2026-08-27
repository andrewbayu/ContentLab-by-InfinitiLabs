import type { TeamMember } from '../services/sheets';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsMention = (text: string, alias: string) => {
  const matcher = new RegExp(`(^|\\s)@${escapeRegex(alias)}(?=$|\\s|[,.!?:;\\)])`, 'i');
  return matcher.test(text);
};

/**
 * Resolves typed @mentions even when a teammate types a unique first name or
 * email handle, while avoiding ambiguous short-name mentions.
 */
export const resolveMentionedUserIds = (
  text: string,
  team: TeamMember[],
  selectedUserIds: string[] = [],
): string[] => {
  const aliasesByMember = new Map<string, Set<string>>();
  const aliasOwners = new Map<string, Set<string>>();

  team.forEach((member) => {
    const aliases = new Set<string>();
    const fullName = member.name.trim().toLocaleLowerCase();
    const emailHandle = member.email.split('@')[0]?.trim().toLocaleLowerCase();

    if (fullName) {
      aliases.add(fullName);
      fullName.split(/\s+/).filter(Boolean).forEach((part) => aliases.add(part));
    }
    if (emailHandle) aliases.add(emailHandle);

    aliasesByMember.set(member.id, aliases);
    aliases.forEach((alias) => {
      const owners = aliasOwners.get(alias) ?? new Set<string>();
      owners.add(member.id);
      aliasOwners.set(alias, owners);
    });
  });

  const validMemberIds = new Set(team.map((member) => member.id));
  const resolved = new Set(selectedUserIds.filter((id) => validMemberIds.has(id)));

  team.forEach((member) => {
    const fullName = member.name.trim().toLocaleLowerCase();
    const aliases = aliasesByMember.get(member.id) ?? new Set<string>();
    const isMentioned = [...aliases].some((alias) => {
      const isFullName = alias === fullName;
      const isUniqueAlias = aliasOwners.get(alias)?.size === 1;
      return (isFullName || isUniqueAlias) && containsMention(text, alias);
    });

    if (isMentioned) resolved.add(member.id);
  });

  return [...resolved];
};
