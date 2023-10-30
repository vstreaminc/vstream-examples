import { program } from "./program.mjs";

import "./commands/configure.mjs";
import "./commands/login.mjs";
import "./commands/channels/get-channel-info.mjs";
import "./commands/channels/get-channel.mjs";

program.parse();
