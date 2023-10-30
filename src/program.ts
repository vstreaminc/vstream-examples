import { Command } from "@commander-js/extra-typings";

export const program = new Command();

program
  .name("vstream")
  .description("VStream's official CLI app")
  .version("0.0.1");
