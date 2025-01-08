import { Command } from "jsr:@cliffy/command@1.0.0-rc.7";
import { cloneFromAPI } from "./cosenseCodeClone.ts";
import { cloneFromJSON } from "./fromJSON.ts";

const clone = new Command()
    .arguments("<projectName:string> [destination:string]")
    .description(
        "fetch scrapbox project specified in projectName and clone code and pages to destination(not specified is to ./projectName/).",
    )
    .action((_options, projectName, destination_) => {
        const destination = destination_ ? destination_ : projectName;
        cloneFromAPI("clone", projectName, destination);
    });
const pull = new Command()
    .arguments("<projectName:string> [destination:string]")
    .description(
        "equvialent to clone, but fetch changed pages only. and deleted pages in cosense is not deleted in file.",
    )
    .action((_options, projectName, destination_) => {
        const destination = destination_ ? destination_ : projectName;
        cloneFromAPI("pull", projectName, destination);
    });
const json = new Command()
    .arguments("<fileName:string> <destination:string>")
    .description(
        "generate html and codeblocks file from cosense json.",
    )
    .action((_options, fileName, destination) => {
        cloneFromJSON(fileName, destination);
    });

await new Command()
    .command("clone", clone)
    .command("pull", pull)
    .command("json", json)
    .parse(Deno.args);
