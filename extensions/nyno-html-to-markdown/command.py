from bs4 import BeautifulSoup
from markdownify import markdownify as md


def nyno_html_to_markdown(args, context):
    input_data = args[0] if args and len(args) > 0 else None

    if not input_data:
        err_msg = "No HTML content provided in args[0]"
        print(err_msg)

        set_name = context.get("set_context", "prev")
        context[f"{set_name}.error"] = {"errorMessage": err_msg}
        return 1

    set_name = context.get("set_context", "prev")

    try:
        def process_html(html):
            soup = BeautifulSoup(html, "html.parser")

            # ---- Extract front matter ----
            front_matter = {}

            if soup.title and soup.title.string:
                front_matter["title"] = soup.title.string.strip()

            for meta in soup.find_all("meta"):
                name = meta.get("name") or meta.get("property")
                content = meta.get("content")
                if name and content:
                    front_matter[name] = content

            # ---- HARD FILTERING ----
            for tag in soup(["script", "style", "noscript", "template"]):
                tag.decompose()

            for tag in soup.find_all("footer"):
                tag.decompose()

            # ---- Pick real content ----
            content_root = (
                soup.find("main")
                or soup.find("article")
                or soup.find(attrs={"role": "main"})
                or soup.body
            )

            html_content = str(content_root) if content_root else str(soup)

            # Convert to markdown
            markdown = md(html_content, heading_style="ATX")

            return {
                "frontMatter": front_matter,
                "markdown": markdown,
            }

        if isinstance(input_data, list):
            context[set_name] = [process_html(item) for item in input_data]
        else:
            context[set_name] = process_html(input_data)

        return 0  # success

    except Exception as err:
        print(err)
        context[f"{set_name}.error"] = {"errorMessage": str(err)}
        return 1  # failure
