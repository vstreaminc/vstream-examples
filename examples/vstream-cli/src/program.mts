import { Command } from "@commander-js/extra-typings";

export const program = new Command();

program
  .name("vstream")
  .description("A CLI application built with VStream's public API")
  .version("0.0.1");
