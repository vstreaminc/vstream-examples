import prettyjson from "prettyjson";
import { Option } from "@commander-js/extra-typings";

export const FORMAT_OPTION = new Option(
  "-f, --format <format>",
  "output format"
)
  .choices(["pretty", "json"])
  .default("pretty");

export function format(format: string, data: unknown) {
  return format === "json" ? formatJSON(data) : formatPretty(data);
}

export function formatJSON(data: unknown) {
  return JSON.stringify(data, null, 2);
}

export function formatPretty(data: unknown) {
  return prettyjson.render(data);
}
