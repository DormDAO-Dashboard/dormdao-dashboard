export type MemberRole = 'member' | 'club_admin' | 'director' | 'president' | 'dorm_admin';

export interface RoleProfile {
  role: MemberRole | null | undefined;
  school: string | null | undefined;
}

export function isClubLeadership(profile: RoleProfile): boolean {
  return ['club_admin', 'director', 'president', 'dorm_admin'].includes(profile.role ?? '');
}

export function isDormAdmin(profile: RoleProfile): boolean {
  return profile.role === 'dorm_admin';
}

export function isSameSchool(profile: RoleProfile, school: string): boolean {
  return (profile.school ?? '').trim().toLowerCase() === (school ?? '').trim().toLowerCase();
}

export function canModerate(profile: RoleProfile, school: string): boolean {
  return isDormAdmin(profile) || (isClubLeadership(profile) && isSameSchool(profile, school));
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  member:     'Member',
  club_admin: 'Admin',
  director:   'Director',
  president:  'President',
  dorm_admin: 'DormDAO Admin',
};

export const ROLE_OPTIONS = [
  { value: 'member',    label: 'Member' },
  { value: 'club_admin', label: 'Club Admin (PM / Admin)' },
  { value: 'director',  label: 'Director' },
  { value: 'president', label: 'President' },
] as const;
