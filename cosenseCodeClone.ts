import * as parser from "@progfay/scrapbox-parser"
import type * as cosenseTypes from "@cosense/types/rest"; // MIT License
import * as libcosense from "@bsahd/libcosense"; // MIT License
import ProgressBar from "@deno-library/progress"; // MIT License
import { delay } from "@std/async"; // MIT License


function sanitizeDirName(name: string) {
  // Windowsで使えない文字を考慮
  if (Deno.build.os == "windows") {
    return name.replaceAll("%", "%25").replaceAll(":", "%3A").replaceAll(
      "*",
      "%2A",
    ).replaceAll("?", "%3F").replaceAll('"', "%22").replaceAll("<", "%3C")
      .replaceAll(">", "%3E").replaceAll("?", "%3F").replaceAll(
        "|",
        "%7C",
      );
  } else {
    return name;
  }
}
function sanitizeFileName(name: string) {
  // Windowsで使えない文字を考慮
  if (Deno.build.os == "windows") {
    return name.replaceAll("%", "%25").replaceAll(":", "%3A").replaceAll(
      "*",
      "%2A",
    ).replaceAll("?", "%3F").replaceAll('"', "%22").replaceAll("<", "%3C")
      .replaceAll(">", "%3E").replaceAll("?", "%3F").replaceAll(
        "|",
        "%7C",
      ).replaceAll("/", "%2F");
  } else {
    return name.replaceAll("/", "%2F");
  }
}

async function getPage(page: libcosense.PageListItem, MODE: "clone" | "pull") {
  const pagename = page.title;
  try {
    if(pagename.includes("../")){
      console.log("pagename \""+pagename+"\" is danger!not clone this page.")
    }
    if (MODE == "pull") {
      const fileexists = await fileExists(
        `./${destination}/${sanitizeDirName(pagename)}/text.txt`,
      );
      if (fileexists) {
        const filestat = (await Deno.stat(
          `./${destination}/${sanitizeDirName(pagename)}/text.txt`,
        )).mtime?.getTime();
        if (
          filestat &&
          filestat / 1000 > page.updated
        ) {
          return;
        } else {
          console.log("updated", pagename);
          for await (
            const entry of Deno.readDir(
              `./${destination}/${sanitizeDirName(pagename)}/`,
            )
          ) {
            if (entry.isFile) {
              Deno.remove(
                `./${destination}/${sanitizeDirName(pagename)}/${entry.name}`,
              );
            }
          }
        }
      }
    }
    await Deno.mkdir(
      `./${destination}/${sanitizeDirName(pagename)}`,
      { recursive: true },
    );
    const page2 = await page.getDetail()
    const pagetext = page2.lines.map((a) => a.text).join("\n");
    const pageparse = parser.parse(
      pagetext,
    );
    await Deno.writeTextFile(
      `./${destination}/${sanitizeDirName(pagename)}/text.txt`,
      pagetext,
    );
    await Deno.writeTextFile(
      `./${destination}/${sanitizeDirName(pagename)}/json.json`,
      JSON.stringify(page),
    );
    for (const element of pageparse) {
      if (element.type == "codeBlock") {
        try {
          await Deno.writeTextFile(
            `./${destination}/${sanitizeDirName(pagename)}/${
              sanitizeFileName(element.fileName)
            }`,
            element.content,
          );
        } catch (e) {
          console.error(e);
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function fileExists(filepath: string | URL): Promise<boolean> {
  try {
    await Deno.stat(filepath);
    return true;
  } catch {
    return false;
  }
}

let PROJECT_NAME = "";
let destination = "";
export async function cloneFromAPI(
  MODE: "clone" | "pull",
  PROJECT_NAME_: string,
  destination_: string,
) {
  PROJECT_NAME = PROJECT_NAME_;
  destination = destination_;
  const pageCount = (await (await fetch(
    `https://scrapbox.io/api/pages/${PROJECT_NAME}/?limit=10`,
  )).json() as cosenseTypes.PageList).count;

  if (await fileExists(`./${destination}`) && MODE == "clone") {
    await Deno.remove(
      `./${destination}`,
      { recursive: true },
    );
    console.log("deleted");
  }
  if (!(await fileExists(`./${destination}`))) {
    await Deno.mkdir(
      `./${destination}`,
    );
  }
  await Deno.writeTextFile(
    `./${destination}/index.html`,
    "",
  );
  const indexPages: string[] = [];
  const PARALLEL = 16;
  
  const pagelist: cosenseTypes.BasePage[] = [];
  const pj = await libcosense.Project.new(PROJECT_NAME)
  indexPages.push(...pagelist.map((a) => a.title));
  const progress = new ProgressBar({ title: "Cloning:", total: pageCount });
  let connections = 0;
  let getted = 0;
  for await (const item of pj.pageList()) {
    while (connections > PARALLEL) {
      await delay(50);
    }
    await progress.render(getted);
    connections++;
    getPage(item, MODE).then(() => {
      getted++;
      connections--;
    });
  }
}
