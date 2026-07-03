export const cx = (...classes: ReadonlyArray<string | false | undefined>): string =>
  classes.filter((value) => typeof value === "string" && value !== "").join(" ")
