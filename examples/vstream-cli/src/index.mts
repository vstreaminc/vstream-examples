import { program } from "./program.mjs";

import "./commands/configure.mjs";
import "./commands/login.mjs";
import "./commands/channels/get-channel-info.mjs";
import "./commands/channels/get-channel-metrics.mjs";
import "./commands/channels/get-channel.mjs";
import "./commands/channels/lookup-channel.mjs";
import "./commands/channels/tail-events.mjs";
import "./commands/videos/lookup-video.mjs";

program.parse();
