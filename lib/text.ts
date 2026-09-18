export function describeResultCount(total: number) {
  return `${total.toLocaleString("en-US")} ${total === 1 ? "provider matches" : "providers match"} your search`;
}
