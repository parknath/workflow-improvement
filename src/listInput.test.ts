import { describe, expect, it } from "vitest";
import { formatListInput, parseListInput, updateListDraft } from "./listInput";

describe("list input editing", () => {
  it("keeps the raw trailing space while storing a normalized list", () => {
    expect(updateListDraft("Google ")).toEqual({ raw: "Google ", values: ["Google"] });
    expect(updateListDraft("Google Sheets")).toEqual({ raw: "Google Sheets", values: ["Google Sheets"] });
  });

  it("supports multi-word comma and newline separated values", () => {
    expect(parseListInput("Google Sheets, Google Calendar\nImportant email")).toEqual(["Google Sheets", "Google Calendar", "Important email"]);
    expect(formatListInput(["Google Sheets", "Google Calendar"])).toBe("Google Sheets, Google Calendar");
  });
});
