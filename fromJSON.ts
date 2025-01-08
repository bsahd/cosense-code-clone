import * as parser from "@progfay/scrapbox-parser"; // MIT License
import type * as cosenseTypes from "@cosense/types/rest"; // MIT License

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
  related: string[],
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
  for (const element of related) {
    html += `<li><a href="${"../".repeat(slashcount)}${
      hsc(sanitizeDirName(element))
    }/text.html">${hsc(element)}</a></li>`;
  }
  html += `</ul>`;
  html += `<p>JSONから生成した場合、2 hop linksは使用できません<p>`;
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
let PROJECT_NAME = "";
let destination = ""

export async function cloneFromJSON(jsonFileName: string,destination_:string) {
  destination=destination_

  const data: cosenseTypes.BackupData = JSON.parse(
    await Deno.readTextFile(jsonFileName),
  );
  PROJECT_NAME = data.name;

  const pageCount = data.pages.length;

  try {
    await Deno.remove(
      `./${destination}`,
      { recursive: true },
    );
    console.log("deleted");
  } catch {
    //
  }
  await Deno.mkdir(
    `./${destination}`,
  );
  await Deno.writeTextFile(
    `./${destination}/index.html`,
    "",
  );

  await generateIndexHTML(data.pages.map((a) => a.title));
  let skipnum = 0;
  for (const page of data.pages) {
    skipnum++;
    console.log(
      `${skipnum}/${pageCount}`,
    );
    try {
      const pagename = page.title;
      await Deno.mkdir(
        `./${destination}/${sanitizeDirName(pagename)}`,
        { recursive: true },
      );
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
          page.linksLc.concat(
            data.pages.filter((a) => a.linksLc.includes(pagename)).map((a) =>
              a.title
            ),
          ),
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
}
