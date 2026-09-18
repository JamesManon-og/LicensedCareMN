/** Avatar initials: the first letters of the first two words ("A & E Homes Inc" → "AE"). */
export function initials(name: string) {
  const [first = name, second] = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return (second ? first[0] + second[0] : first.slice(0, 2)).toUpperCase();
}

export function describeResultCount(total: number) {
  return `${total.toLocaleString("en-US")} ${total === 1 ? "provider matches" : "providers match"} your search`;
}
