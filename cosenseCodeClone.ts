import * as parser from "@progfay/scrapbox-parser"; // MIT License
import type * as cosenseTypes from "@cosense/types/rest"; // MIT License
import * as cosenseStd from "@cosense/std"; // MIT License
import ProgressBar from "@deno-library/progress"; // MIT License
import { delay } from "@std/async"; // MIT License

function hsc(unsafeText: string) {
  if (typeof unsafeText !== "string") {
    return unsafeText;
  }
  return unsafeText.replace(
    /[&'`"<>]/g,
    function (match) {
      return {
        "&": "&amp;",
        "'": "&#x27;",
        "`": "&#x60;",
        '"': "&quot;",
        "<": "&lt;",
        ">": "&gt;",
      }[match as "&" | "'" | "`" | '"' | "<" | ">"];
    },
  );
}
function arrayRange(start: number, stop: number, step: number) {
  return Array.from(
    { length: (stop - start) / step + 1 },
    (_, index) => start + index * step,
  );
}

function genereteHTML_Node(node: parser.Node, slashcount: number): string {
  switch (node.type) {
    case "quote":
      return `<q>${
        node.nodes.map((a) => genereteHTML_Node(a, slashcount)).join("")
      }</q>`;
    case "helpfeel":
      return node.text;
    case "strong":
      return `<strong>${
        node.nodes.map((a) => genereteHTML_Node(a, slashcount)).join("")
      }</strong>`;
    case "formula":
      return `<code>math:${hsc(node.formula)}</code>`;
    case "decoration":
      return node.nodes.map((a) => genereteHTML_Node(a, slashcount))
        .join("");
    case "code":
      return `<code>${hsc(node.text)}</code>`;
    case "commandLine":
      return `<code>${hsc(node.text)}</code>`;
    case "blank":
      return "";
    case "strongImage":
    case "image":
      return `<a href="${hsc(encodeURI(node.src))}">[image]</a>`;
    case "link":
      if (node.pathType == "absolute") {
        return `<a href="${hsc(encodeURI(node.href))}">${
          hsc(node.content)
        }</a>`;
      } else if (node.pathType == "root") {
        return `<a href="https://scrapbox.io${hsc(node.href)}">${
          hsc(node.href)
        }</a>`;
      }
      return `<a href="${"../".repeat(slashcount)}${
        hsc(sanitizeDirName(node.href))
      }/text.html">${hsc(node.href)}</a>`;
    case "googleMap":
      return `<a href="${hsc(encodeURI(node.url))}">[map]</a>`;
    case "strongIcon":
    case "icon":
      if (node.pathType == "root") {
        return `<a href="https://scrapbox.io${hsc(node.path)}">[${
          hsc(node.path)
        }.icon]</a>`;
      }
      return `<a href="${"../".repeat(slashcount)}${
        hsc(sanitizeDirName(node.path))
      }/text.html">[${hsc(node.path)}.icon]</a>`;
    case "hashTag":
      return `<a href="${"../".repeat(slashcount)}${
        hsc(sanitizeDirName(node.href))
      }/text.html">#${hsc(node.href)}</a>`;
    case "numberList":
      return `${node.number}. ${
        node.nodes.map((a) => genereteHTML_Node(a, slashcount))
          .join("")
      }`;
    case "plain":
      return node.text;
  }
}
function generateHTML(
  page: parser.Page,
  slashcount: number,
  related: cosenseTypes.RelatedPages,
) {
  let html = `
	<!DOCTYPE HTML><html><head><title>${
    page[0].type == "title" ? page[0].text : "unknown"
  }</title></head><body>
	<a href="${
    "../".repeat(slashcount)
  }index.html">top</a>, <a href="https://scrapbox.io/${PROJECT_NAME}/${
    page[0].type == "title" ? page[0].text : ""
  }">online</a>, <a href="./">source</a>`;
  for (const block of page) {
    if (block.type == "title") {
      html += `<h1>${hsc(block.text)}</h1>`;
    } else if (block.type == "line") {
      html += `<p style="margin-left:${block.indent}em;">${
        block.nodes.map((a) => genereteHTML_Node(a, slashcount)).join(
          "",
        )
      }</p>`;
    } else if (block.type == "table") {
      html += `<table style="margin-left:${block.indent}em;">`;
      html += `table:${hsc(block.fileName)}`;
      for (const rows of block.cells) {
        html += `<tr>`;
        for (const cols of rows) {
          html += `<td>`;
          html += cols.map((a) => genereteHTML_Node(a, slashcount))
            .join("");
          html += `</td>`;
        }
        html += `</tr>`;
      }
      html += `</table>`;
    } else if (block.type == "codeBlock") {
      html += `<p><a href="${hsc(sanitizeFileName(block.fileName))}">code:${
        hsc(block.fileName)
      }</a></p>`;
    }
  }
  html += `<h1>1 hop links</h1><ul>`;
  for (const element of related.links1hop) {
    html += `<li><a href="${"../".repeat(slashcount)}${
      hsc(sanitizeDirName(element.titleLc))
    }/text.html">${hsc(element.titleLc)}</a></li>`;
  }
  html += `</ul>`;
  html += `</body></html>`;
  return html;
}

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
async function generateIndexHTML(indexPages: string[]) {
  indexPages.sort();
  const indexGrouped = Object.groupBy(indexPages, (a) => a[0]);
  await Deno.writeTextFile(
    `./${destination}/index.html`,
    `
	<!DOCTYPE HTML>
	<html>
		<head>
			<title>pages of ${hsc(PROJECT_NAME)}</title>
		</head>
		<body>
			<h1>pages of ${hsc(PROJECT_NAME)}</h1>
			${
      Object.entries(indexGrouped).map(([k, _]) =>
        `<a href="#${hsc(k)}" style="padding-inline-end:4px;">${hsc(k)}</a>`
      ).join("")
    }
			<ul>
			${
      Object.entries(indexGrouped).map(([k, v]) =>
        `<li id="${hsc(k)}">${hsc(k)}<ul>${
          v?.map((v) =>
            `<li><a href="${hsc(encodeURI(sanitizeDirName(v)))}/text.html">${
              hsc(v)
            }</a></li>`
          ).join("")
        }</ul></li>`
      ).join("")
    }
			</ul>
		</body>
	</html>
	`,
  );
}

async function getPage(pagei: cosenseTypes.BasePage, MODE: "clone" | "pull") {
  const pagename = pagei.title;
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
          filestat / 1000 > pagei.updated
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
    const page: cosenseTypes.Page = await (await fetch(
      `https://scrapbox.io/api/pages/${PROJECT_NAME}/${
        encodeURIComponent(pagename)
      }`,
    )).json();
    const pagetext = page.lines.map((a) => a.text).join("\n");
    const pageparse = parser.parse(
      pagetext,
    );
    await Deno.writeTextFile(
      `./${destination}/${sanitizeDirName(pagename)}/text.txt`,
      pagetext,
    );
    await Deno.writeTextFile(
      `./${destination}/${sanitizeDirName(pagename)}/text.html`,
      generateHTML(
        pageparse,
        pagename.split("/").length,
        page.relatedPages,
      ),
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
  let progress = new ProgressBar({ title: "fetching page list:", total: pageCount });
  for (const skipnum of arrayRange(0, pageCount, 1000)) {
    const pglistw = await cosenseStd.listPages(PROJECT_NAME, {
      skip: skipnum,
      limit: 1000,
      sort: "updated",
    });
    if (!pglistw.ok) {
      continue;
    }
    progress.render(skipnum)
    pagelist.push(...pglistw.val.pages);
  }
  indexPages.push(...pagelist.map((a) => a.title));
  progress = new ProgressBar({ title: "Cloning:", total: pageCount });
  await generateIndexHTML(indexPages);
  let connections = 0;
  let getted = 0;
  for (const item of pagelist) {
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
