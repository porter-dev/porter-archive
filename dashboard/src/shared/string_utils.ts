export const readableDate = (s: string) => {
  const ts = new Date(s);
  const date = ts.toLocaleDateString();
  const time = ts.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${time} on ${date}`;
};

export const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
};
