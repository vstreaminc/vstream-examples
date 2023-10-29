import { Command } from "@commander-js/extra-typings";

const program = new Command();

program
  .name("vstream")
  .description("VStream's official CLI app")
  .version("0.0.1");

program.parse();
