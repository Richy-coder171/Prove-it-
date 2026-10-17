export function hasAllowedRole(user, roles) {
  return !roles || roles.includes(user.role);
}
