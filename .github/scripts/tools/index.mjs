import tool0 from "./call-agent-via-issue.js";
import tool1 from "./felo-cli.js";
import tool2 from "./google-stitch.js";
import tool3 from "./summary.js";

const tools = [tool0, tool1, tool2, tool3].filter(Boolean);

export { tools };
export default { tools };
